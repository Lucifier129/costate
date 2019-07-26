export const isArray = Array.isArray

export const isFunction = (input: any) => typeof input === 'function'

export const isObject = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}

export const merge = <T = any>(target: object | Array<T>, source: object | Array<T>) => {
  if (isArray(source) && isArray(target)) {
    source.forEach((value, index) => {
      target[index] = value
    })
  } else if (isObject(source) && isObject(target)) {
    Object.assign(target, source)
  }
  return target
}
