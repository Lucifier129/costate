import React, { Dispatch } from 'react'
import co, { watch, read, hasCostate } from './costate'

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
      // update state directly
      setState(read(costate))
    },
    [costate]
  )

  useEffect(() => {
    coreducerRef.current = coreducer
  }, [coreducer])

  useEffect(() => {
    /**
     * if initialState is linked a costate, no need to watch it
     * it must be watched by parent or another useCostate in function-component
     */
    if (hasCostate(initialState)) return
    // setState will not cause re-render if the new state is equal the old one
    // so it is safe to watch costate, re-render when costate is mutated out side the dispatch
    return watch(costate, setState)
  }, [])

  return [read(costate), dispatch]
}
