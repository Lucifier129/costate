import 'jest'
import { Costate, isCostate, read } from '../src/costate'
import useCoreducer, { Coreducer, CoreducerState, CoreducerAction } from '../src/useCoreducer'
import React from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'

const delay = (timeout = 4) => new Promise(resolve => setTimeout(resolve, timeout))

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

describe('useCoreducer', () => {
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
      let [state, dispatch] = useCoreducer<Coreducer<{ count: number }, { type: string }>>(
        (costate, action) => {
          switch (action.type) {
            case 'incre': {
              costate.count += 1
              break
            }
            case 'decre': {
              costate.count -= 1
              break
            }
          }
        },
        {
          count: 0
        }
      )

      let handleClick = () => {
        dispatch({
          type: 'decre'
        })
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

    expect(button.textContent).toBe('-1')

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await delay()

    expect(button.textContent).toBe('-2')
  })
})
