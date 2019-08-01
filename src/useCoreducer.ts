import React, { Dispatch } from 'react'
import co, { read } from './costate'

const { useState, useMemo, useRef, useCallback, useEffect } = React

export default function useCoreducer<State extends any[] | object, Action>(
  coreducer: (costate: State, action: Action) => void,
  initialState: State
): [State, Dispatch<Action>] {
  let [_, setState] = useState()
  let costate = useMemo(() => co(initialState), [])
  let coreducerRef = useRef(coreducer)
  let dispatch = useCallback<Dispatch<Action>>(
    action => {
      coreducerRef.current(costate, action)
      setState(read(costate))
    },
    [costate]
  )

  useEffect(() => {
    coreducerRef.current = coreducer
  }, [coreducer])

  return [read(costate), dispatch]
}
