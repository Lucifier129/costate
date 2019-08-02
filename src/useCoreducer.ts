import React, { Dispatch } from 'react'
import co from './costate'
import useCostate from './useCostate'

const { useRef, useCallback, useEffect } = React

export default function useCoreducer<State extends any[] | object, Action>(
  coreducer: (costate: State, action: Action) => void,
  initialState: State
): [State, Dispatch<Action>] {
  let state = useCostate(initialState)
  let coreducerRef = useRef(coreducer)
  let dispatch = useCallback<Dispatch<Action>>(action => {
    coreducerRef.current(co(state), action)
  }, [])

  useEffect(() => {
    coreducerRef.current = coreducer
  }, [coreducer])

  return [state, dispatch]
}
