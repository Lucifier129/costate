# API Docs

## Basic API

```javascript
import createCostate, { co, read, watch, isCostate, hasCostate, remove } from 'costate'
import { useCostate, useCoreducer } from 'costate'
```

### createCostate(state) => costate

create co-state by state

### getState(costate) => state

read the latest state from co-state

### getCostate(state) => costate

retrive costate from state derived by costate

### co(arg) => costate | state

combined getState and getCostate

- if `arg` is state, return costate
- if `arg` is costate, return state

### isCostate(arg) => boolean

check if `arg` is a co-state or not

### hasCostate(state) => boolean

check if `state` has corresponding co-state or not

### watch(costate, watcher: state => void) => unwatch

watch a co-state, watcher function will receive state when co-state changed

### remove(costate) => void

remove co-state from its all parents

- if its parent is array, delete array item
- if its parent is object, delete object key

## React-Hooks API

### useCostate(state) => state

return a new state which has corresponding co-state as a implicity property

### useCoreducer((costate, action) => void, initialState) => [state, dispatch]

receive a coreducer(handle co-state and action) and initialState, return state and dispatch function, just like [useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) without `init` argument.
