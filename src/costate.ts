import { isArray, isObject, merge, createDeferred } from './util'

const IMMUTABLE = Symbol('IMMUTABLE')
const CONNECTOR = Symbol('CONNECTOR')
const PROMISE = Symbol('PROMISE')
const COSTATE = Symbol('COSTATE')

const SymbolAsyncIterator = Symbol.asyncIterator

export const isCostate = (input: any) => !!(input && input[IMMUTABLE])

export const hasCostate = (input: any) => !!(input && input[COSTATE])

export const read = <T>(input: Costate<T> | T): T => {
  if (!isCostate(input)) return input
  return input[IMMUTABLE]()
}

export type Costate<T> = T & AsyncIterableIterator<T>

type Key = string | number
type Keys = Key[]

type Connector = {
  parents: Map<Costate<any>, Key | Keys>
  notify: () => void
  connect: (child: Costate<any>, Key) => void
  disconnect: (child: Costate<any>, Key) => void
  clear: () => void
}

const createConnector = <T = any>(proxy: Costate<T>): Connector => {
  let parents = new Map<Costate<any>, Key | Keys>()

  let connect = (parent, key) => {
    if (!parents.has(parent)) {
      parents.set(parent, key)
      return
    }

    let keys = parents.get(parent)

    if (keys === key) return

    if (!isArray(keys)) {
      keys = [keys]
    }

    if (!keys.includes(key)) {
      keys.push(key)
    }

    parents.set(parent, keys)
  }

  let disconnect = (parent, key) => {
    let keys = parents.get(parent)

    if (keys == null) return

    if (!isArray(keys) || keys.length === 1) {
      parents.delete(parent)
    } else {
      let index = keys.indexOf(key)
      keys.splice(index, 1)
    }
  }

  let notify = () => {
    for (let [parent, keys] of parents) {
      if (!isArray(keys)) {
        parent[keys] = proxy
        continue
      }

      for (let key of keys) {
        parent[key] = proxy
      }
    }
  }

  let remove = (parent, key) => {
    if (isArray(parent)) {
      let index = parent.indexOf(proxy)
      if (index !== -1) {
        parent.splice(index, 1)
      }
    } else {
      delete parent[key]
    }
  }

  let clear = () => {
    for (let [parent, keys] of parents) {
      if (!isArray(keys)) {
        remove(parent, keys)
        continue
      }

      // remove will cause mutable keys, copy to make sure for-of work expectly
      for (let key of [...keys]) {
        remove(parent, key)
      }
    }
  }

  return {
    parents,
    clear,
    notify,
    connect,
    disconnect
  }
}

const createImmutable = costate => {
  let isArrayType = isArray(costate)
  let immutableTarget = isArrayType ? [] : {}

  let link = () => {
    Object.defineProperty(immutableTarget, COSTATE, {
      get: () => costate
    })
  }

  let isDirty = false

  let mark = () => {
    isDirty = true
  }

  let compute = () => {
    if (!isDirty) return immutableTarget

    isDirty = false

    if (isArrayType) {
      immutableTarget = []
      for (let i = 0; i < costate.length; i++) {
        immutableTarget[i] = read(costate[i])
      }
    } else {
      immutableTarget = {}
      for (let key in costate) {
        immutableTarget[key] = read(costate[key])
      }
    }

    link()

    return immutableTarget
  }

  link()

  return {
    mark,
    compute
  }
}

const co = <T extends Array<any> | object>(state: T): Costate<T> => {
  if (!isObject(state) && !isArray(state)) {
    throw new Error(`Expect state to be array or object, instead of ${state}`)
  }

  if (isCostate(state)) return state as Costate<T>
  if (state[COSTATE]) return state[COSTATE] as Costate<T>

  let isArrayType = isArray(state)

  let target = isArrayType ? [] : {}

  let uid = 0
  let consuming = false

  let notify = () => {
    // notify the connected parents
    connector.notify()

    // not consuming, no need to resolve
    if (!consuming) return

    // tslint:disable-next-line: no-floating-promises
    Promise.resolve(++uid).then(doNotify) // debounced by promise
  }

  let deferred = createDeferred<T>()

  let doNotify = (n: number) => {
    if (n !== uid) return
    deferred.resolve(read(proxy))
    deferred = createDeferred<T>()
    consuming = false
  }

  let asyncIterator = async function*() {
    while (true) yield await proxy[PROMISE]
  }

  let handlers: ProxyHandler<T> = {
    get(target, key, receiver) {
      if (key === IMMUTABLE) return immutable.compute
      if (key === CONNECTOR) return connector

      if (key === PROMISE) {
        consuming = true
        return deferred.promise
      }

      if (SymbolAsyncIterator && key === SymbolAsyncIterator) {
        return asyncIterator
      }

      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      if (typeof key === 'symbol') {
        return Reflect.set(target, key, value, receiver)
      }

      // list.push will trigger both index-key and length-key, ignore it
      if (isArrayType && key === 'length' && value === (target as Array<any>).length) {
        return true
      }

      let prevValue = target[key]

      if (isObject(value) || isArray(value)) {
        value = co(value)
      }

      if (isCostate(value)) {
        value[CONNECTOR].connect(proxy, key)
      }

      immutable.mark()
      Reflect.set(target, key, value, receiver)

      // disconnnect prev child
      if (value !== prevValue && isCostate(prevValue)) {
        prevValue[CONNECTOR].disconnect(proxy, key)
      }

      notify()

      return true
    },

    deleteProperty(target, key) {
      if (typeof key === 'symbol') {
        return Reflect.deleteProperty(target, key)
      }

      let value = target[key]

      if (isCostate(value)) {
        value[CONNECTOR].disconnect(proxy, key)
      }

      immutable.mark()
      Reflect.deleteProperty(target, key)

      notify()

      return true
    }
  }

  let proxy = new Proxy(target, handlers) as Costate<T>
  let connector = createConnector(proxy)
  let immutable = createImmutable(proxy)

  // internal merging
  merge(proxy, state)

  return proxy
}

export default co

export type CostateValue<R extends Costate<any>> = R extends Costate<infer S> ? S : never

type unwatch = () => void
export type CostateWatcher = <T extends Costate<any>>(state: CostateValue<T>) => void

export const watch = <T extends Costate<any>>(costate: T, watcher: CostateWatcher): unwatch => {
  if (!isCostate(costate)) {
    throw new Error(`Expected costate, but received ${costate}`)
  }

  if (typeof watcher !== 'function') {
    throw new Error(`Expected watcher to be a function, instead of ${watcher}`)
  }

  let unwatched = false

  let consume = state => {
    if (unwatched) return
    watcher(state)
    f()
  }

  let f = () => {
    if (unwatched) return
    costate[PROMISE].then(consume)
  }

  f()

  return () => {
    unwatched = true
  }
}

export const remove = <T extends Costate<any>>(costate: T): void => {
  if (!isCostate(costate)) {
    throw new Error(`Expected costate, but got ${costate}`)
  }
  costate[CONNECTOR].clear()
}
