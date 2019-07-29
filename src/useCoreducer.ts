import { useRef, useCallback, Dispatch, useEffect } from 'react'
import { Costate } from './costate'
import useCostate from './useCostate'

export default function useCoreducer<State extends Array<any> | object, Action>(
  reducer: (costate: Costate<State>, action: Action) => void,
  initialState: State | Costate<State>
): [State, Dispatch<Action>, Costate<State>]

export default function useCoreducer(coreducer, initialState) {
  let coreducerRef = useRef(coreducer)
  let [state, costate] = useCostate(initialState)
  let dispatch = useCallback(action => {
    coreducerRef.current(costate, action)
  }, [])

  useEffect(() => {
    coreducerRef.current = coreducer
  }, [coreducer])

  return [state, dispatch, costate]
}
