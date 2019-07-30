import 'jest'
import useCostate from '../src/useCostate'
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'

const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout))

/**
 * Suppress React 16.8 act() warnings globally.
 * The react teams fix won't be out of alpha until 16.9.0.
 */
const consoleError = console.error
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (!args[0].includes('Warning: An update to %s inside a test was not wrapped in act')) {
      consoleError(...args)
    }
  })
})

describe('useCostate', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    container = null
  })

  it('works corrently', async () => {
    let Test = () => {
      let [state, costate] = useCostate({ count: 0 })

      let handleClick = () => {
        costate.count += 1
      }

      return <button onClick={handleClick}>{state.count}</button>
    }

    act(() => {
      ReactDOM.render(<Test />, container)
    })

    const button = container.querySelector('button')

    expect(button.textContent).toBe('0')

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await delay()

    expect(button.textContent).toBe('1')

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await delay()

    expect(button.textContent).toBe('2')
  })

  // it('support linked state', async () => {
  //   let contents = ['', 'a', 'ab', 'abc']
  //   let App = () => {
  //     let [state] = useCostate({ text: { value: ''} })

  //     useEffect(() => {
  //       expect(state.text.value).toBe(contents.shift())
  //     }, [state.text])

  //     return <Input text={state.text} />
  //   }

  //   let Input = props => {
  //     let [text, cotext] = useCostate(props.text)

  //     let handleChange = event => {
  //       cotext.value = event.target.value
  //     }

  //     return <input type="text" onChange={handleChange} value={text.value} />
  //   }

  //   act(() => {
  //     ReactDOM.render(<App />, container)
  //   })

  //   const input = container.querySelector('input')

  //   act(() => {
  //     input.value = 'a'
  //   })

  //   // await delay()

  //   // expect(input.textContent).toBe('1')

  //   // act(() => {
  //   //   input.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  //   // })

  //   // await delay()

  //   // expect(input.textContent).toBe('2')
  // })
})
