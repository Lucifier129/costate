import { isArray, isObject, merge, createDeferred } from './util'

const INTERNAL = Symbol('INTERNAL')
const COSTATE = Symbol('COSTATE')

export const isCostate = (input: any) => !!(input && input[INTERNAL])

export const hasCostate = (input: any) => !!(input && input[COSTATE])

export const read = <T extends any[] | object = any>(input: T): T => {
  if (!isCostate(input)) return input
  return input[INTERNAL].compute()
}

type Key = string | number
type Keys = Key[]

const createConnector = <T = any>(costate: T) => {
  let parents = new Map<any, Key | Keys>()

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

  let each = function*(current = parents) {
    for (let [parent] of current) {
      yield parent
      let grandparents = parent[INTERNAL].parents
      for (let grandparent of each(grandparents)) {
        yield grandparent
      }
    }
  }

  let remove = (parent, key) => {
    if (isArray(parent)) {
      let index = parent.indexOf(costate)
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
    each,
    parents,
    clear,
    connect,
    disconnect
  }
}

const createImmutable = <T extends any[] | object>(costate: T) => {
  let isArrayType = isArray(costate)
  let immutableTarget = (isArrayType ? [] : {}) as T

  let link = () => {
    Object.defineProperty(immutableTarget, COSTATE, {
      enumerable: false,
      writable: false,
      value: costate
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
      immutableTarget = [] as T
      for (let i = 0; i < (costate as any[]).length; i++) {
        immutableTarget[i] = read(costate[i])
      }
    } else {
      immutableTarget = {} as T
      for (let key in costate) {
        immutableTarget[key as string] = read(costate[key as string])
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

export type CoOptions = {
  ReactHooks?: boolean
}

const defaults: CoOptions = {
  ReactHooks: false
}

let costateId = 0

const co = <T extends Array<any> | object>(state: T, options?: CoOptions): T => {
  if (!isObject(state) && !isArray(state)) {
    throw new Error(`Expect state to be array or object, instead of ${state}`)
  }

  if (isCostate(state)) return state
  if (state[COSTATE]) return state[COSTATE] as T

  options = Object.assign({} as CoOptions, defaults, options)

  let isReactHooks = options.ReactHooks

  let isArrayType = isArray(state)

  let target = isArrayType ? [] : {}

  let uid = 0
  let consuming = false

  let normalNotify = () => {
    immutable.mark()

    if (consuming) {
      // tslint:disable-next-line: no-floating-promises
      Promise.resolve(++uid).then(doNotify) // debounced by promise
    }

    for (let parent of connector.each()) {
      parent[INTERNAL].notify()
    }
  }

  let notify = () => {
    immutable.mark()

    if (consuming) {
      if (!isReactHooks) {
        // tslint:disable-next-line: no-floating-promises
        Promise.resolve(++uid).then(doNotify) // debounced by promise
      }
    }

    let root = null

    for (let parent of connector.each()) {
      if (!root || root[INTERNAL].id > parent[INTERNAL].id) {
        root = parent
      }
      parent[INTERNAL].mark()
    }
  }

  let deferred = createDeferred<T>()

  let doNotify = (n: number) => {
    if (n !== uid) return
    deferred.resolve(read(proxy))
    deferred = createDeferred<T>()
    consuming = false
  }

  let handlers: ProxyHandler<T> = {
    get(target, key, receiver) {
      if (key === INTERNAL) return internal

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
        value[INTERNAL].connect(proxy, key)
      }

      Reflect.set(target, key, value, receiver)

      // disconnnect prev child
      if (value !== prevValue && isCostate(prevValue)) {
        prevValue[INTERNAL].disconnect(proxy, key)
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
        value[INTERNAL].disconnect(proxy, key)
      }

      Reflect.deleteProperty(target, key)

      notify()

      return true
    }
  }

  let proxy = new Proxy(target, handlers) as T
  let connector = createConnector<T>(proxy)
  let immutable = createImmutable<T>(proxy)
  let internal = {
    id: costateId++,
    connect: connector.connect,
    disconnect: connector.disconnect,
    clear: connector.clear,
    compute: immutable.compute,
    mark: immutable.mark,
    get parents() {
      return connector.parents
    },
    notify,
    get promise() {
      consuming = true
      return deferred.promise
    }
  }

  merge(proxy, state)

  return proxy
}

export default co

export type Unwatch = () => void
export type Watcher<T> = (state: T) => void

export const watch = <T extends any[] | object = any>(costate: T, watcher: Watcher<T>): Unwatch => {
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
    costate[INTERNAL].promise.then(consume)
  }

  f()

  return () => {
    unwatched = true
  }
}

export const remove = <T extends any[] | object = any>(costate: T): void => {
  if (!isCostate(costate)) {
    throw new Error(`Expected costate, but got ${costate}`)
  }
  costate[INTERNAL].clear()
}
