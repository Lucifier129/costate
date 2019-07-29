import { isArray, isObject, merge, createDeferred } from './util'

const IMMUTABLE = Symbol('IMMUTABLE')
const PARENTS = Symbol('PARENTS')

const internalKeys = [IMMUTABLE, PARENTS]

export const isCostate = (input: any) => !!(input && input[IMMUTABLE])

export const read = <T>(input: Costate<T> | T): T => {
  if (!isCostate(input)) return input
  return input[IMMUTABLE]()
}

export type Costate<T> = T & AsyncIterableIterator<T>

const co = <T extends object>(state: T): Costate<T> => {
  if (!isObject(state) && !isArray(state)) {
    throw new Error(`Expect state to be array or object, instead of ${state}`)
  }

  if (isCostate(state)) return state as Costate<T>

  let deferred = createDeferred<T>()

  let target = (isArray(state) ? [] : {}) as T

  let immutableTarget = (isArray(state) ? [] : {}) as T

  let parents = new Map()

  let copy = () => {
    if (isArray(immutableTarget)) {
      immutableTarget = [...immutableTarget] as T
    } else {
      immutableTarget = { ...immutableTarget }
    }
  }

  let notifyParents = () => {
    for (let [parent, key] of parents) {
      parent[key] = proxy
    }
  }

  let timer: NodeJS.Timeout | null = null

  let notify = (key: string | number | symbol) => {
    if (typeof key === 'symbol') {
      if (internalKeys.indexOf(key) !== -1) return
    }

    notifyParents()
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(doNotify, 0)
  }

  let doNotify = () => {
    deferred.resolve(immutableTarget)
    deferred = createDeferred<T>()
  }

  let handlers: ProxyHandler<T> = {
    set(target, key, value) {
      if (isObject(value) || isArray(value)) {
        value = co(value)
      }

      if (isCostate(value)) {
        value[PARENTS].set(proxy, key)
      }

      // copy before assigning
      copy()

      immutableTarget[key] = read(value)
      target[key] = value

      notify(key)

      return true
    },

    deleteProperty(target, key) {
      let value = target[key]

      if (isCostate(value)) {
        value[PARENTS].delete(proxy)
      }

      // copy before deleting
      copy()

      delete immutableTarget[key]
      delete target[key]

      notify(key)

      return true
    }
  }

  let proxy = new Proxy(target, handlers)

  Object.defineProperties(proxy, {
    [IMMUTABLE]: {
      value: () => immutableTarget
    },
    [PARENTS]: {
      value: parents
    },
    [Symbol.asyncIterator]: {
      value: async function*() {
        while (true) yield await deferred.promise
      }
    }
  })

  merge(proxy, state)

  return proxy as Costate<T>
}

export default co
