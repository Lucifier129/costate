import { useRef, useCallback, useEffect, Dispatch } from 'react'
import co, { Costate } from './costate'
import useCostate from './useCostate'

export default function useCoreducer<State extends Array<any> | object, Action>(
  reducer: (costate: Costate<State>, action: Action) => void,
  initialState: State | Costate<State>
): [State, Dispatch<Action>]

export default function useCoreducer(coreducer, initialState) {
  let state = useCostate(initialState)
  let costateRef = useRef(co(state))
  let coreducerRef = useRef(coreducer)
  let dispatch = useCallback(action => {
    coreducerRef.current(costateRef.current, action)
  }, [])

  useEffect(() => {
    coreducerRef.current = coreducer
  }, [coreducer])

  return [state, dispatch]
}
