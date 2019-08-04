import { isArray, isObject, merge, createDeferred } from './util'

const INTERNAL = Symbol('INTERNAL')
const COSTATE = Symbol('COSTATE')

export const isCostate = (input: any): boolean => {
  return !!(input && input[INTERNAL])
}

export const hasCostate = (input: any) => !!(input && input[COSTATE])

export type Source = any[] | object

export const getState = <T extends Source>(input: T): T => {
  if (!isCostate(input)) {
    throw new Error(`Expect ${input} to be a costate`)
  }
  return input[INTERNAL].compute()
}

export const getCostate = <T extends Source>(input: T): T => {
  if (!hasCostate(input)) {
    throw new Error(`${input} has no corresponding costate`)
  }
  return input[COSTATE]
}

export const co = <T extends Source>(input: T) => {
  if (isCostate(input)) return getState(input)
  if (hasCostate(input)) return getCostate(input)

  throw new Error(`${input} is not costate or has corresponding costate`)
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

  let computeArray = () => {
    immutableTarget = [] as T

    for (let i = 0; i < (costate as any[]).length; i++) {
      let item = costate[i]

      if (isCostate(item)) {
        immutableTarget[i] = getState(item)
      } else {
        immutableTarget[i] = item
      }
    }
  }

  let computeObject = () => {
    immutableTarget = {} as T

    for (let key in costate) {
      let value = costate[key as string]

      if (isCostate(value)) {
        immutableTarget[key as string] = getState(value)
      } else {
        immutableTarget[key as string] = value
      }
    }
  }

  let compute = () => {
    if (!isDirty) return immutableTarget

    isDirty = false

    if (isArrayType) {
      computeArray()
    } else {
      computeObject()
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

const createCostate = <T extends Source>(state: T): T => {
  if (!isObject(state) && !isArray(state)) {
    let message = `Expect state to be array or object, instead of ${state}`
    throw new Error(message)
  }

  let isArrayType = isArray(state)

  let target = isArrayType ? [] : {}

  let connection = {
    parent: null,
    key: null
  }

  let connect = (parent, key) => {
    connection.parent = parent
    connection.key = key
  }

  let disconnect = () => {
    connection.parent = null
    connection.key = null
  }

  let remove = () => {
    if (!connection.parent) return

    let { parent, key } = connection

    if (isArray(parent)) {
      let index = parent.indexOf(costate)
      parent.splice(index, 1)
    } else {
      delete parent[key]
    }
  }

  let uid = 0
  let consuming = false
  let deferred = createDeferred<T>()

  let doResolve = (n: number) => {
    if (n !== uid) return
    deferred.resolve(getState(costate) as T)
    deferred = createDeferred<T>()
    consuming = false
  }

  let notify = () => {
    immutable.mark()

    if (consuming) {
      // tslint:disable-next-line: no-floating-promises
      Promise.resolve(++uid).then(doResolve) // debounced by promise
    }
    if (connection.parent) {
      connection.parent[INTERNAL].notify()
    }
  }

  let handlers: ProxyHandler<T> = {
    get(target, key, receiver) {
      if (key === INTERNAL) return internal

      return Reflect.get(target, key, receiver)
    },

    set(target, key, value, receiver) {
      let prevValue = target[key]

      if (prevValue === value) return true

      if (typeof key === 'symbol') {
        return Reflect.set(target, key, value, receiver)
      }

      if (isArrayType && key === 'length' && value < (target as any[]).length) {
        // disconnect coitem when reduce array.length
        for (let i = value; i < (target as any[]).length; i++) {
          let item = target[i]
          if (isCostate(item)) {
            item[INTERNAL].disconnect()
          }
        }
      }

      if (isObject(value) || isArray(value)) {
        value = createCostate(value)
      }

      // connect current value
      if (isCostate(value)) {
        value[INTERNAL].connect(costate, key)
      }

      // disconnect previous value
      if (isCostate(prevValue)) {
        prevValue[INTERNAL].disconnect()
      }

      Reflect.set(target, key, value, receiver)

      notify()

      return true
    },

    deleteProperty(target, key) {
      if (typeof key === 'symbol') {
        return Reflect.deleteProperty(target, key)
      }

      let value = target[key]

      if (isCostate(value)) {
        value[INTERNAL].disconnect()
      }

      Reflect.deleteProperty(target, key)

      notify()

      return true
    }
  }

  let costate = new Proxy(target, handlers) as T
  let immutable = createImmutable<T>(costate)
  let internal = {
    compute: immutable.compute,
    connect,
    disconnect,
    notify,
    remove,
    get promise() {
      consuming = true
      return deferred.promise
    }
  }

  merge(costate, state)

  return costate
}

export default createCostate

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
  costate[INTERNAL].remove()
}
