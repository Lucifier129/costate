import 'jest'
import {
  createCostate,
  co,
  getState,
  getCostate,
  hasCostate,
  isCostate,
  watch,
  remove
} from '../src'

const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout))

describe('createCostate', () => {
  it('can be watched and unwatched', done => {
    let costate = createCostate({ count: 0 })

    let i = 0

    let unwatch = watch(costate, ({ count }) => {
      expect(count).toBe(i)
      if (count >= 2) {
        if (count > 2) throw new Error('unwatch failed')
        unwatch()
        done()
      }
    })

    let timer
    let provider = () => {
      timer = setInterval(() => {
        costate.count = ++i
        if (i >= 4) clearInterval(timer)
      }, 10)
    }

    // tslint:disable-next-line: no-floating-promises
    provider()
  })

  it('should throw error when watch target is not a costate or watcher is not a functionh', () => {
    expect(() => {
      watch({} as any, () => {})
    }).toThrow()

    expect(() => {
      watch(createCostate({}), 1 as any)
    }).toThrow()
  })

  it('works correctly with object', async done => {
    let costate = createCostate({ count: 0 })

    let count = 0
    let unwatch = watch(costate, state => {
      count += 1
      expect(state.count).toEqual(count)
      if (count >= 10) {
        unwatch()
        done()
      }
    })

    for (let i = 0; i < 10; i++) {
      await delay()
      costate.count += 1
    }
  })

  it('works correctly with array', async done => {
    let colist = createCostate([] as number[])

    let count = 0
    let unwatch = watch(colist, list => {
      count += 1
      for (let i = 0; i < count; i++) {
        expect(list[i]).toBe(i)
      }

      if (count >= 10) {
        unwatch()
        done()
        return
      }
    })

    for (let i = 0; i < 10; i++) {
      await delay()
      colist.push(i)
    }
  })

  it('works correctly with nest structure', async done => {
    let costate = createCostate({ counts: [] as number[] })

    let count = 0

    let unwatch = watch(costate, state => {
      count += 1

      for (let i = 0; i < count; i++) {
        expect(state.counts[i]).toBe(i)
      }

      if (count >= 10) {
        unwatch()
        done()
        return
      }
    })

    for (let i = 0; i < 10; i++) {
      await delay()
      costate.counts.push(i)
    }
  })

  it('can detect delete object property', done => {
    let costate = createCostate({ a: 1, b: 2 })

    watch(costate, state => {
      expect(state.hasOwnProperty('b')).toBe(false)
      done()
    })

    expect(costate.hasOwnProperty('b')).toBe(true)

    delete costate.b

    expect(costate.hasOwnProperty('b')).toBe(false)
  })

  it('can detect add object property', done => {
    let costate = createCostate<{ a: number; b: number; c?: number }>({ a: 1, b: 2 })

    watch(costate, state => {
      expect(state.hasOwnProperty('c')).toBe(true)
      done()
    })

    expect(costate.hasOwnProperty('c')).toBe(false)

    costate.c = 1

    expect(costate.hasOwnProperty('c')).toBe(true)
  })

  it('should disconnect array item correctly', done => {
    let colist = createCostate([{ value: 1 }, { value: 2 }, { value: 3 }])
    let covalue0 = colist[0]

    colist.length = 0

    watch(colist, list => {
      console.log('list', list)
      throw new Error('disconnect failed')
    })

    covalue0.value += 1

    setTimeout(() => done(), 4)
  })

  it('can detect delete array item', () => {
    let colist = createCostate([1, 2, 3])
    let list0 = getState(colist)

    colist.splice(1, 1)

    let list1 = getState(colist)

    expect(list0).toEqual([1, 2, 3])
    expect(list1).toEqual([1, 3])
  })

  it('should not reuse costate', () => {
    let cochild = createCostate({ a: 1, b: 2 })
    let coparent = createCostate({ child1: cochild, child2: cochild })

    cochild.b -= 1

    expect(getState(cochild)).toEqual({
      a: 1,
      b: 1
    })

    let state = getState(coparent)

    expect(createCostate(state) === coparent).toBe(false)

    expect(state.child1 === state.child2).toBe(false)

    expect(state).toEqual({
      child1: {
        a: 1,
        b: 2
      },
      child2: {
        a: 1,
        b: 2
      }
    })

    delete coparent.child1

    let state1 = getState(coparent)

    expect(state1).toEqual({
      child2: {
        a: 1,
        b: 2
      }
    })

    coparent.child2.a += 1

    let state2 = getState(coparent)

    expect(state2).toEqual({
      child2: {
        a: 2,
        b: 2
      }
    })
  })

  it('should support debounce', done => {
    let costate = createCostate({ count: 0 })

    watch(costate, state => {
      expect(state.count).toBe(10)
      done()
    })

    for (let i = 0; i < 10; i++) {
      costate.count += 1
    }
  })

  it('can be detected and retrived', () => {
    let costate = createCostate({ count: 0 })
    let state = getState(costate)

    expect(isCostate({ count: 0 })).toBe(false)
    expect(isCostate(state)).toBe(false)
    expect(isCostate(costate)).toBe(true)

    expect(hasCostate(state)).toBe(true)
    expect(hasCostate(costate)).toBe(false)
    expect(hasCostate({ count: 0 })).toBe(false)

    expect(costate === getCostate(state)).toBe(true)
    expect(state === getState(costate)).toBe(true)

    expect(state).toEqual({ count: 0 })
  })

  it('co works correctly', () => {
    let costate = createCostate({ a: 1 })

    expect(co(costate)).toEqual({ a: 1 })
    expect(co(co(costate)) === costate).toBe(true)
    expect(co(costate) === co(costate)).toBe(true)

    expect(() => {
      co(1 as any)
    }).toThrow()
  })

  it('should throw error when getState call on non-costate value', () => {
    expect(() => {
      getState({})
    }).toThrow()
  })

  it('should throw error when getCostate call on object which is not derived by costate', () => {
    expect(() => {
      getCostate({})
    }).toThrow()
  })

  it('object state derived by costate should be immutable', () => {
    let costate = createCostate({ a: { value: 1 }, b: { value: 1 }, c: { value: 1 } })
    let state0 = getState(costate)

    costate.a.value += 1
    let state1 = getState(costate)

    costate.b.value += 1
    let state2 = getState(costate)

    costate.c.value += 1
    let state3 = getState(costate)

    expect(state0 !== state1).toBe(true)
    expect(state0 !== state2).toBe(true)
    expect(state0 !== state3).toBe(true)
    expect(state1 !== state2).toBe(true)
    expect(state1 !== state3).toBe(true)
    expect(state2 !== state3).toBe(true)

    expect(state0.a !== state1.a).toBe(true)
    expect(state0.b === state1.b).toBe(true)
    expect(state0.c === state1.c).toBe(true)

    expect(state1.a === state2.a).toBe(true)
    expect(state1.b !== state2.b).toBe(true)
    expect(state1.c === state2.c).toBe(true)

    expect(state2.a === state3.a).toBe(true)
    expect(state2.b === state3.b).toBe(true)
    expect(state2.c !== state3.c).toBe(true)

    expect(state0).toEqual({ a: { value: 1 }, b: { value: 1 }, c: { value: 1 } })
    expect(state1).toEqual({ a: { value: 2 }, b: { value: 1 }, c: { value: 1 } })
    expect(state2).toEqual({ a: { value: 2 }, b: { value: 2 }, c: { value: 1 } })
    expect(state3).toEqual({ a: { value: 2 }, b: { value: 2 }, c: { value: 2 } })
  })

  it('list state derived by costate should be immutable', () => {
    let colist = createCostate([{ value: 1 }, { value: 1 }, { value: 1 }])
    let list0 = getState(colist)

    colist[0].value += 1
    let list1 = getState(colist)

    colist[1].value += 1
    let list2 = getState(colist)

    colist[2].value += 1
    let list3 = getState(colist)

    expect(list0 !== list1).toBe(true)
    expect(list0 !== list2).toBe(true)
    expect(list0 !== list3).toBe(true)
    expect(list1 !== list2).toBe(true)
    expect(list1 !== list3).toBe(true)
    expect(list2 !== list3).toBe(true)

    expect(list0[0] !== list1[0]).toBe(true)
    expect(list0[1] === list1[1]).toBe(true)
    expect(list0[2] === list1[2]).toBe(true)

    expect(list1[0] === list2[0]).toBe(true)
    expect(list1[1] !== list2[1]).toBe(true)
    expect(list1[2] === list2[2]).toBe(true)

    expect(list2[0] === list3[0]).toBe(true)
    expect(list2[1] === list3[1]).toBe(true)
    expect(list2[2] !== list3[2]).toBe(true)

    expect(list0).toEqual([{ value: 1 }, { value: 1 }, { value: 1 }])
    expect(list1).toEqual([{ value: 2 }, { value: 1 }, { value: 1 }])
    expect(list2).toEqual([{ value: 2 }, { value: 2 }, { value: 1 }])
    expect(list3).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])

    colist.push({ value: 1 })
    let list4 = getState(colist)

    expect(list4 !== list3).toBe(true)
    expect(list4[0] === list3[0]).toBe(true)
    expect(list4[1] === list3[1]).toBe(true)
    expect(list4[2] === list3[2]).toBe(true)

    expect(list3).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])
    expect(list4).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }, { value: 1 }])

    colist.pop()
    let list5 = getState(colist)

    expect(list5 !== list3).toBe(true)
    expect(list5[0] === list3[0]).toBe(true)
    expect(list5[1] === list3[1]).toBe(true)
    expect(list5[2] === list3[2]).toBe(true)

    expect(list3).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])
    expect(list5).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])
  })

  it('should ignore the change of symbol key', () => {
    let symbol0: any = Symbol('0')
    let symbol1: any = Symbol('1')
    let costate = createCostate({ count: 1, [symbol0]: 1, [symbol1]: 1 })
    let state0 = getState(costate)

    costate[symbol0] += 1

    let state1 = getState(costate)

    expect(state0 === state1).toBe(true)

    delete costate[symbol1]

    let state2 = getState(costate)

    expect(state0 === state2).toBe(true)
  })

  it('should throw error if the arg passing to co is not object or array', () => {
    expect(() => {
      createCostate(() => 1)
    }).toThrow()
  })

  it('should disconnect correctly', () => {
    let costate = createCostate({ a: { value: 1 }, b: { value: 2 } })

    costate.a.value += 1

    let state1 = getState(costate)

    expect(state1.a.value).toBe(2)

    let oldA = costate.a

    costate.a = { value: 1 }

    let state2 = getState(costate)

    expect(state2.a.value).toBe(1)

    oldA.value += 1

    expect(getState(oldA)).toEqual({ value: 3 })

    let state3 = getState(costate)

    expect(state3.a).toEqual({ value: 1 })
  })

  it('costate object can be removed', done => {
    let costate = createCostate({
      a: { value: 1 },
      b: { value: 2 },
      c: { value: 3 },
      d: { value: 4 }
    })
    let state0 = getState(costate)

    watch(costate, state => {
      expect(state === state1).toBe(true)
      done()
    })

    remove(costate.a)
    remove(costate.c)

    let state1 = getState(costate)

    expect(state0).toEqual({ a: { value: 1 }, b: { value: 2 }, c: { value: 3 }, d: { value: 4 } })
    expect(state1).toEqual({ b: { value: 2 }, d: { value: 4 } })
  })

  it('costate array can be removed', done => {
    let colist = createCostate([{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }])
    let list0 = getState(colist)

    watch(colist, list => {
      expect(list === list1).toBe(true)
      done()
    })

    remove(colist[3])
    remove(colist[0])

    let list1 = getState(colist)

    expect(list0).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }])
    expect(list1).toEqual([{ value: 2 }, { value: 3 }])
  })

  it('should throw error when remove target is not a costate', () => {
    expect(() => {
      remove(1 as any)
    }).toThrow()
  })
})
