import { useState, useEffect, useMemo } from 'react'
import co, { read, watch, isLinkedState, Costate } from './costate'

export default function useCostate<T extends object = any>(initialState: T): [T, Costate<T>] {
  let costate = useMemo(() => co(initialState), [])
  let [_, setState] = useState<T>(initialState)

  useEffect(() => {
    /**
     * if initialState is linked a costate, no need to watch it
     * it must be watched by parent or another useCostate in function-component
     */
    if (isLinkedState(initialState)) return
    return watch(costate, setState)
  }, [])

  return [read(costate), costate]
}
