import { useRef, useCallback, Dispatch, useEffect } from 'react'
import { Costate } from './costate'
import useCostate from './useCostate'

export type Coreducer<S extends object, A> = (costate: Costate<S>, action: A) => void

export type CoreducerState<R extends Coreducer<any, any>> = R extends Coreducer<infer S, any>
  ? S
  : never

export type CoreducerAction<R extends Coreducer<any, any>> = R extends Coreducer<any, infer A>
  ? A
  : never

export default function useCoreducer<R extends Coreducer<any, any>>(
  reducer: R,
  initialState: CoreducerState<R>
): [CoreducerState<R>, Dispatch<CoreducerAction<R>>]

export default function useCoreducer(coreducer, initialState) {
  let coreducerRef = useRef(coreducer)
  let [state, costate] = useCostate(initialState)
  let dispatch = useCallback(action => {
    coreducerRef.current(costate, action)
  }, [])

  useEffect(() => {
    coreducerRef.current = coreducer
  }, [coreducer])

  return [state, dispatch]
}
