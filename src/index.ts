import createCostate from './costate'
import useCostate from './useCostate'
import useCoreducer from './useCoreducer'

export {
  co,
  getState,
  getCostate,
  isCostate,
  hasCostate,
  watch,
  remove,
  Source,
  Watcher,
  Unwatch
} from './costate'

export { useCostate, useCoreducer }

export default createCostate
