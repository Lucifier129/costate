import co from './costate'
import useCostate from './useCostate'
import useCoreducer from './useCoreducer'
import { version } from '../package.json'

export { version }

export { read, watch, hasCostate, remove, isCostate, Watcher, Unwatch } from './costate'

export { useCostate, useCoreducer }

export default co
