import { isArray, isObject, merge, createDeferred } from './util'

const IMMUTABLE = Symbol('IMMUTABLE')
const PARENTS = Symbol('PARENTS')
const PROMISE = Symbol('PROMISE')

const internalKeys = [IMMUTABLE, PARENTS, PROMISE]

export const isCostate = (input: any) => !!(input && input[IMMUTABLE])

export const read = <T>(input: Costate<T> | T): T => {
  if (!isCostate(input)) return input
  return input[IMMUTABLE]()
}

export type Costate<T> = T & AsyncIterableIterator<T>

type Key = string | number | symbol
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
      let index = keys.findIndex(key)
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

const co = <T extends Array<any> | object>(state: T): Costate<T> => {
  if (!isObject(state) && !isArray(state)) {
    throw new Error(`Expect state to be array or object, instead of ${state}`)
  }

  if (isCostate(state)) return state as Costate<T>

  let deferred = createDeferred<T>()

  let isArrayType = isArray(state)

  let target = isArrayType ? [] : {}

  let immutableTarget = isArrayType ? [] : {}

  let copy = () => {
    if (isArray(immutableTarget)) {
      immutableTarget = [...immutableTarget]
    } else {
      immutableTarget = { ...immutableTarget }
    }
  }

  let timer: NodeJS.Timeout | null = null

  let notify = (key: string | number | symbol) => {
    if (typeof key === 'symbol') {
      if (internalKeys.indexOf(key) !== -1) return
    }

    connector.notify()
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(doNotify, 0)
  }

  let doNotify = () => {
    deferred.resolve(immutableTarget as T)
    deferred = createDeferred<T>()
  }

  let handlers: ProxyHandler<T> = {
    set(target, key, value) {
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

      // copy before assigning
      copy()

      immutableTarget[key] = read(value)
      target[key] = value

      // disonnnect prev child
      if (isCostate(prevValue) && value !== prevValue) {
        connector.disconnect(prevValue, key)
      }

      notify(key)

      return true
    },

    deleteProperty(target, key) {
      let value = target[key]

      if (isCostate(value)) {
        connector.disconnect(value, key)
      }

      // copy before deleting
      copy()

      delete immutableTarget[key]
      delete target[key]

      notify(key)

      return true
    }
  }

  let proxy = new Proxy(target, handlers) as Costate<T>
  let connector = createConnector(proxy)

  Object.defineProperties(proxy, {
    [IMMUTABLE]: {
      value: () => immutableTarget,
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
