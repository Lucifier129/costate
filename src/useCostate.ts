import { useState, useEffect, useMemo } from 'react'
import co, { watch, read, hasCostate } from './costate'

export default function useCostate<T extends any[] | object = any>(initialState: T): T {
  let costate = useMemo(() => co(initialState), [])
  let [state, setState] = useState<T>(() => read(costate))

  useEffect(() => {
    /**
     * if initialState is linked a costate, no need to watch it
     * it must be watched by parent or another useCostate in function-component
     */
    if (hasCostate(initialState)) return
    return watch(costate, setState)
  }, [])

  return state
}
