import { isArray, isObject, merge, createDeferred } from './util'

const IMMUTABLE = Symbol('IMMUTABLE')
const PARENTS = Symbol('PARENTS')
const PROMISE = Symbol('PROMISE')
const COSTATE = Symbol('COSTATE')

const internalKeys = [IMMUTABLE, PARENTS, PROMISE, COSTATE]

export const isCostate = (input: any) => !!(input && input[IMMUTABLE])

export const isLinkedState = (input: any) => !!(input && input[COSTATE])

export const read = <T>(input: Costate<T> | T): T => {
  if (!isCostate(input)) return input
  return input[IMMUTABLE]()
}

export type Costate<T> = T & AsyncIterableIterator<T>

type Key = string | number
type Keys = Key[]

type Connector = {
  notify: () => void
  connect: (child: Costate<any>, Key) => void
  disconnect: (child: Costate<any>, Key) => void
}

const createConnector = <T = any>(proxy: Costate<T>): Connector => {
  let parents = new Map()

  let connect = (child, key) => {
    let parents = child[PARENTS] as Map<Costate<any>, Key | Keys>

    if (!parents.has(proxy)) {
      parents.set(proxy, key)
      return
    }

    let keys = parents.get(proxy)
    if (!isArray(keys)) {
      keys = [keys]
    }
    if (!keys.includes(key)) {
      keys.push(key)
    }
  }

  let disconnect = (child, key) => {
    let parents = child[PARENTS] as Map<Costate<any>, Key | Keys>

    if (!parents.has(proxy)) {
      throw new Error(`${key} is not connected, it can't be delete`)
    }

    let keys = parents.get(proxy)
    if (!isArray(keys) || keys.length === 1) {
      parents.delete(proxy)
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

  Object.defineProperty(proxy, PARENTS, {
    value: parents,
    enumerable: false,
    writable: false
  })

  return {
    notify,
    connect,
    disconnect
  }
}

const createImmutable = costate => {
  let isArrayType = isArray(costate)
  let immutableTarget = isArrayType ? [] : {}
  let pendingOperators: Record<Key, 'set' | 'delete'> = {}

  let link = () => {
    Object.defineProperty(immutableTarget, COSTATE, {
      writable: false,
      enumerable: false,
      value: costate
    })
  }

  let copy = () => {
    if (isArrayType) {
      immutableTarget = [...(immutableTarget as any[])]
    } else {
      immutableTarget = { ...immutableTarget }
    }
    link()
  }

  let set = key => {
    pendingOperators[key] = 'set'
  }

  let deleteProperty = key => {
    pendingOperators[key] = 'delete'
  }

  let compute = () => {
    let entries = Object.entries(pendingOperators)

    if (entries.length === 0) {
      return immutableTarget
    }

    pendingOperators = {}

    // copy on write
    copy()

    for (let [key, type] of entries) {
      if (type === 'set') {
        immutableTarget[key] = read(costate[key])
      } else if (type === 'delete') {
        delete immutableTarget[key]
      } else {
        throw new Error(`Unknown Operator ${type}`)
      }
    }

    return immutableTarget
  }

  link()

  return {
    set,
    deleteProperty,
    compute
  }
}

const co = <T extends Array<any> | object>(state: T): Costate<T> => {
  if (!isObject(state) && !isArray(state)) {
    throw new Error(`Expect state to be array or object, instead of ${state}`)
  }

  if (isCostate(state)) return state as Costate<T>
  if (state[COSTATE]) return state[COSTATE] as Costate<T>

  let deferred = createDeferred<T>()

  let isArrayType = isArray(state)

  let target = isArrayType ? [] : {}

  let uid = 0

  let notify = (key: Key) => {
    if (typeof key === 'symbol') {
      if (internalKeys.indexOf(key) !== -1) return
    }

    // notify connected parents
    connector.notify()

    // tslint:disable-next-line: no-floating-promises
    Promise.resolve(++uid).then(doNotify) // debounced by promise
  }

  let doNotify = (n: number) => {
    if (n !== uid) return
    deferred.resolve(read(proxy))
    deferred = createDeferred<T>()
  }

  let handlers: ProxyHandler<T> = {
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
        connector.connect(value, key)
      }

      immutable.set(key)
      target[key] = value

      // disonnnect prev child
      if (isCostate(prevValue) && value !== prevValue) {
        connector.disconnect(prevValue, key)
      }

      notify(key)

      return true
    },

    deleteProperty(target, key) {
      if (typeof key === 'symbol') {
        return Reflect.deleteProperty(target, key)
      }

      let value = target[key]

      if (isCostate(value)) {
        connector.disconnect(value, key)
      }

      immutable.deleteProperty(key)
      delete target[key]

      notify(key)

      return true
    }
  }

  let proxy = new Proxy(target, handlers) as Costate<T>
  let connector = createConnector(proxy)
  let immutable = createImmutable(proxy)

  Object.defineProperties(proxy, {
    [IMMUTABLE]: {
      value: immutable.compute,
      enumerable: false,
      writable: false
    },
    [PROMISE]: {
      value: () => deferred.promise,
      enumerable: false,
      writable: false
    },
    [Symbol.asyncIterator]: {
      value: async function*() {
        while (true) yield await deferred.promise
      },
      enumerable: false,
      writable: false
    }
  })

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
    costate[PROMISE]().then(consume)
  }

  f()

  return () => {
    unwatched = true
  }
}
