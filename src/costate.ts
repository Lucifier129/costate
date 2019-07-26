import { isFunction, isArray, isObject, merge } from './util'

const IMMUTABLE = Symbol('IMMUTABLE')
const PARENTS = Symbol('PARENTS')
const WATCH = Symbol('WATCH')

const internalKeys = [IMMUTABLE, PARENTS, WATCH]

const isWatchable = input => !!(input && input[IMMUTABLE])
const getImmutable = input => {
  if (!isWatchable(input)) return input
  return input[IMMUTABLE]()
}

const watchable = input => {
  if ((!isObject(input) && !isArray(input)) || isWatchable(input)) {
    return input
  }

  let watcherList = []
  let watch = watcher => {
    if (!isFunction(watcher)) {
      throw new Error(`Expect watcher to be a function, instead of ${watcher}`)
    }
    if (watcherList.indexOf(watcher) !== -1) return
    watcherList.push(watcher)
    return () => {
      let index = watcherList.indexOf(watcher)
      if (index !== -1) watcherList.splice(index, 1)
    }
  }

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

  let notifyWatcherList = () => {
    for (let watcher of watcherList) {
      watcher(immutableTarget)
    }
  }

  let notify = key => {
    if (internalKeys.indexOf(key) !== -1) return
    notifyWatcherList()
    notifyParents()
  }

  let handlers: ProxyHandler<object> = {
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

  let proxy = new Proxy(target, handlers)

  Object.defineProperties(proxy, {
    [IMMUTABLE]: {
      value: () => immutableTarget
    },
    [PARENTS]: {
      value: parents
    },
    [WATCH]: {
      value: watch
    }
  })

  merge(proxy, input)

  return proxy
}

const watch = (watchable, watcher) => {
  if (!isWatchable(watchable)) {
    throw new Error(`Expect first argument to be a watchable, instead of ${watchable}`)
  }
  return watchable[WATCH](watcher)
}

let counter = watchable({ count: 0 })

watch(counter, counter => {
  console.log('counter', counter)
})

let state = watchable({
  value: counter
})

console.log('state', state)

watch(state, state => {
  console.log('state', state)
})

setInterval(() => {
  counter.count += 1
}, 1000)
