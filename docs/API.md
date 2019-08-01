# API Docs

## Basic API

### co(state) => costate

create co-state by state

### watch(costate, watcher: state => void) => unwatch

watch a co-state, watcher function will receive state when co-state changed

### read(costate) => state

read the latest state from co-state

### isCostate(arg) => boolean

check if `arg` is a co-state or not

### hasCostate(state) => boolean

check if `state` has corresponding co-state or not

### remove(costate) => void

remove co-state from its all parents

- if its parent is array, delete array item
- if its parent is object, delete object key

## React-Hooks API

### useCostate(state) => state

return a new state which has corresponding co-state as a implicity property

### useCoreducer((costate, action) => void, initialState) => [state, dispatch]

receive a coreducer(handle co-state and action) and initialState, return state and dispatch function, just like [useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) without `init` argument.
