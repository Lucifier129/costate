import React, { Dispatch } from 'react'
import co, { read, Costate } from './costate'

const { useState, useMemo, useRef, useCallback, useEffect } = React

export default function useCoreducer<State extends Array<any> | object, Action>(
  reducer: (costate: Costate<State>, action: Action) => void,
  initialState: State | Costate<State>
): [State, Dispatch<Action>]

export default function useCoreducer(coreducer, initialState) {
  let [_, setState] = useState()
  let costate = useMemo(() => co(initialState), [])
  let coreducerRef = useRef(coreducer)
  let dispatch = useCallback(
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
