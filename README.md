# Welcome to costate 👋

[![npm version](https://img.shields.io/npm/v/costate.svg?style=flat)](https://www.npmjs.com/package/costate)
[![Build Status](https://travis-ci.org/Lucifier129/costate.svg?branch=master)](https://travis-ci.org/Lucifier129/costate)
[![Documentation](https://img.shields.io/badge/documentation-yes-brightgreen.svg)](https://github.com/Lucifier129/costate#readme)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Lucifier129/costate/graphs/commit-activity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Lucifier129/costate/blob/master/LICENSE)
[![Twitter: guyingjie129](https://img.shields.io/twitter/follow/guyingjie129.svg?style=social)](https://twitter.com/guyingjie129)

> A state management library for react inspired by vue 3.0 reactivity api and immer

**costate** is a tiny package that allows you to work with immutable state in a more reactive way.

### 🏠 [Homepage](https://github.com/Lucifier129/costate#readme)

## Features

- mutate costate to derive the next immutable state reactively
- write code in idiomatic javascript style
- no need to centralize all of update-state/reducer function in React Component

## Environment Requirement

- ES2015 Proxy
- ES0215 Map
- ES2015 Symbol

[Can I Use Proxy?](https://caniuse.com/#search=Proxy)

## Install

```sh
npm install --save costate
```

```sh
yarn add costate
```

## [API DOCS](/docs/API.md)

## Usage

```javascript
import co, { watch } from 'costate'

// costate is reactive
const costate = co({ a: 1 })

// state is immutable
watch(costate, state => {
  console.log(`state.a is: ${state.a}`)
})

// mutate costate will emit the next immutable state to watcher
costate.a += 1
```

## Why costate is useful?

Think about **costate** + **react-hooks**!

### Counter

- [demo](https://lucifier129.github.io/costate-examples/build/#Counter)
- [source-code](https://github.com/Lucifier129/costate-examples/blob/master/src/demos/Counter.js)

```javascript
import * as React from 'react'
import co, { useCostate } from 'costate'

function Counter() {
  // useCostate instead of React.useState
  // state is always immutable
  let state = useCostate({ count: 0 })

  let handleIncre = () => {
    // pass state to co, then got the costate which is reactive
    // mutate costate will cause re-render and receive the next state
    co(state).count += 1
  }

  let handleDecre = () => {
    co(state).count -= 1
  }

  return (
    <>
      <button onClick={handleIncre}>+1</button>
      {state.count}
      <button onClick={handleDecre}>-1</button>
    </>
  )
}
```

### TodoApp

- [demo](https://lucifier129.github.io/costate-examples/build/#TodoApp)
- [source-code](https://github.com/Lucifier129/costate-examples/blob/master/src/demos/TodoApp.js)

```javascript
export default function App() {
  // initialize todo-app state
  let state = useCostate({
    todos: [],
    text: {
      value: ''
    }
  })

  useSessionStorage({
    key: 'todos-json',
    getter: () => state,
    setter: source => Object.assign(co(state), source)
  })

  let handleAddTodo = () => {
    if (!state.text.value) {
      return alert('empty content')
    }

    // wrap by co before mutating
    co(state).todos.push({
      id: Date.now(),
      content: state.text.value,
      completed: false
    })
    co(state).text.value = ''
  }

  let handleKeyUp = event => {
    if (event.key === 'Enter') {
      handleAddTodo()
    }
  }

  let handleToggleAll = () => {
    let hasActiveItem = state.todos.some(todo => !todo.completed)
    // wrap by co before mutating
    co(state).todos.forEach(todo => {
      todo.completed = hasActiveItem
    })
  }

  return (
    <>
      <div>
        <TodoInput text={state.text} onKeyUp={handleKeyUp} />
        <button onClick={handleAddTodo}>add</button>
        <button onClick={handleToggleAll}>toggle-all</button>
      </div>
      <Todos todos={state.todos} />
      <Footer todos={state.todos} />
    </>
  )
}

function Todos({ todos }) {
  return (
    <ul>
      {todos.map(todo => {
        return <Todo key={todo.id} todo={todo} />
      })}
    </ul>
  )
}

function Todo({ todo }) {
  // you can create any costate you want
  // be careful, costate must be object or array
  let edit = useCostate({ value: false })
  let text = useCostate({ value: '' })

  let handleEdit = () => {
    // wrap by co before mutating
    co(edit).value = !edit.value
    co(text).value = todo.content
  }

  let handleEdited = () => {
    co(edit).value = false
    // magic happen!!
    // we don't need TodoApp to pass updateTodo function down to Todo
    // we just like todo is local state, wrap by co before mutating it
    // then it will cause TodoApp drived new state and re-render
    co(todo).content = text.value
  }

  let handleKeyUp = event => {
    if (event.key === 'Enter') {
      handleEdited()
    }
  }

  let handleRemove = () => {
    // we don't need TodoApp to pass removeTodo function down to Todo
    // cotodo can be delete by remove function
    remove(co(todo))
  }

  let handleToggle = () => {
    co(todo).completed = !todo.completed
  }

  return (
    <li>
      <button onClick={handleRemove}>remove</button>
      <button onClick={handleToggle}>{todo.completed ? 'completed' : 'active'}</button>
      {edit.value && <TodoInput text={text} onBlur={handleEdited} onKeyUp={handleKeyUp} />}
      {!edit.value && <span onClick={handleEdit}>{todo.content}</span>}
    </li>
  )
}

function TodoInput({ text, ...props }) {
  let handleChange = event => {
    co(text).value = event.target.value
  }
  return <input type="text" {...props} onChange={handleChange} value={text.value} />
}

function Footer({ todos }) {
  let activeItems = todos.filter(todo => !todo.completed)
  let completedItems = todos.filter(todo => todo.completed)

  let handleClearCompleted = () => {
    ;[...completedItems].reverse().forEach(item => remove(co(item)))
  }

  return (
    <div>
      {activeItems.length} item{activeItems.length > 1 && 's'} left |{' '}
      {completedItems.length > 0 && <button onClick={handleClearCompleted}>Clear completed</button>}
    </div>
  )
}
```

## Caveat

- `co(state)` only accept object or array as arguemnt

## Author

👤 **Jade Gu**

- Twitter: [@guyingjie129](https://twitter.com/guyingjie129)
- Github: [@Lucifier129](https://github.com/Lucifier129)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/Lucifier129/costate/issues).

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2019 [Jade Gu](https://github.com/Lucifier129).

This project is [MIT](https://github.com/Lucifier129/costate/blob/master/LICENSE) licensed.

---

_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
