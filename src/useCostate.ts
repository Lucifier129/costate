import { useState, useEffect, useMemo } from 'react'
import co, { Costate } from './costate'

export default function useCostate<T extends object = any>(initialState: T): [T, Costate<T>] {
  let costate = useMemo<Costate<T>>(() => co(initialState), [])
  let [state, setState] = useState<T>(initialState)

  useEffect(() => {
    let isOver = false

    let comsume = async () => {
      for await (let state of costate) {
        if (isOver) return
        setState(state)
        if (isOver) return
      }
    }

    // tslint:disable-next-line: no-floating-promises
    comsume()

    return () => {
      isOver = true
    }
  }, [])

  return [state, costate]
}
