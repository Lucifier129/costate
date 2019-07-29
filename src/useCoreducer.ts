import { useReducer, Dispatch } from 'react'
import co, { read, Costate } from './costate'

export type Coreducer<S extends object, A> = (costate: Costate<S>, action: A) => void

export type CoreducerState<R extends Coreducer<any, any>> = R extends Coreducer<infer S, any>
  ? S
  : never
export type CoreducerAction<R extends Coreducer<any, any>> = R extends Coreducer<any, infer A>
  ? A
  : never

export default function useCoreducer<R extends Coreducer<any, any>>(
  reducer: R,
  initializerArg: CoreducerState<R>
): [Costate<CoreducerState<R>>, Dispatch<CoreducerAction<R>>]

export default function useCoreducer(coreducer, initializerArg) {
  let [costate, dispatch] = useReducer(
    (costate, actions) => {
      coreducer(costate, actions)
      return costate
    },
    initializerArg,
    co
  )

  console.log('state', read(costate))

  return [read(costate), dispatch]
}
