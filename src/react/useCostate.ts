import React from 'react'
import { createCostate, watch, getState, Source } from '../costate'

const { useState, useEffect, useMemo } = React

type GetInitialState<T> = () => T

type InitialState<T> = GetInitialState<T> | T

export default function useCostate<T extends Source = any>(initialState: InitialState<T>): T {
  let costate = useMemo(
    () =>
      createCostate(
        typeof initialState === 'function' ? (initialState as GetInitialState<T>)() : initialState
      ),
    []
  )
  let [state, setState] = useState<T>(() => getState(costate))

  useEffect(() => watch(costate, setState), [])

  return state
}
