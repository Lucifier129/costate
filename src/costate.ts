import { isFunction, isArray, isObject, merge } from './util'

const IMMUTABLE = Symbol('IMMUTABLE')
const PARENTS = Symbol('PARENTS')

const internalKeys = [IMMUTABLE, PARENTS]

const isWatchable = input => !!(input && input[IMMUTABLE])

const getImmutable = input => {
  if (!isWatchable(input)) return input
  return input[IMMUTABLE]()
}

type watchable<T extends object> = {
  [P in keyof T]: T[P]
}

const Deferred = () => {
  let resolve, reject
  let promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { resolve, reject, promise }
}

const watchable = <T extends object>(input: T): watchable<T> => {
  if ((!isObject(input) && !isArray(input)) || isWatchable(input)) {
    return input
  }

  let deferred = Deferred()

  let target = isArray(input) ? [] : {}

  let immutableTarget = isArray(input) ? [] : {}

  let parents = new Map()

  let copy = () => {
    if (isArray(immutableTarget)) {
      immutableTarget = [...immutableTarget]
    } else {
      immutableTarget = { ...immutableTarget }
    }
  }

  let notifyParents = () => {
    for (let [parent, key] of parents) {
      parent[key] = proxy
    }
  }

  let timer = null

  let notify = key => {
    if (internalKeys.indexOf(key) !== -1) return
    notifyParents()
    clearTimeout(timer)
    timer = setTimeout(doNotify, 0)
  }

  let doNotify = () => {
    let { resolve } = deferred
    deferred = Deferred()
    resolve(immutableTarget)
  }

  let handlers: ProxyHandler<T> = {
    set(target, key, value) {
      value = watchable(value)

      if (isWatchable(value)) {
        value[PARENTS].set(proxy, key)
      }

      copy()

      immutableTarget[key] = getImmutable(value)
      target[key] = value

      notify(key)

      return true
    },

    deleteProperty(target, key) {
      let value = target[key]

      if (isWatchable(value)) {
        value[PARENTS].delete(proxy)
      }

      copy()

      delete immutableTarget[key]
      delete target[key]

      notify(key)

      return true
    }
  }

  let proxy = new Proxy(target, handlers) as watchable<T>

  Object.defineProperties(proxy, {
    [IMMUTABLE]: {
      value: () => immutableTarget
    },
    [PARENTS]: {
      value: parents
    },
    [Symbol.asyncIterator]: {
      value: async function*() {
        yield immutableTarget
        while (true) yield await deferred.promise
      }
    }
  })

  merge(proxy, input)

  return proxy
}

export default watchable
