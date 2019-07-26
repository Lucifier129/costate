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

type watchable<T extends object> = {
  [P in keyof T]: T[P]
}

const watchable = <T extends object>(input: T): watchable<T> => {
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

  let timer = null
  let notify = key => {
    if (internalKeys.indexOf(key) !== -1) return
    clearTimeout(timer)
    timer = setTimeout(doNotify)
  }
  let doNotify = () => {
    notifyWatcherList()
    notifyParents()
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
    [WATCH]: {
      value: watch
    }
  })

  merge(proxy, input)

  return proxy
}

type unwatch = () => void
type watcher<T extends object> = (value: T) => void

const watch = <T extends object>(watchable: watchable<T>, watcher: watcher<T>): unwatch => {
  if (!isWatchable(watchable)) {
    throw new Error(`Expect first argument to be a watchable, instead of ${watchable}`)
  }
  return watchable[WATCH](watcher)
}

type Counter = {
  count: number
}

type actions = {
  [key: string]: Function
}

const Counter = (count = 0): Counter => {
  let state = watchable({ count })
  return state
}

const CounterList = (
  initList: Array<{ count: number }> = []
): [Array<{ count: number }>, { add: (count: number) => void }] => {
  let list = watchable(initList)

  let add = count => {
    list.push({ count })
  }

  return [list, { add }]
}

let [counterList, actions] = CounterList()

watch(counterList, list => {
  console.log('list', list)
})

setInterval(() => {
  actions.add(Math.random())
}, 1000)

// let counter = watchable({ count: 0 })

// watch(counter, counter => {
//   console.log('counter', counter)
// })

// let state = watchable({
//   value: counter
// })

// console.log('state', state)

// watch(state, state => {
//   console.log('state', state)
// })

// setInterval(() => {
//   counter.count += 1
// }, 1000)
