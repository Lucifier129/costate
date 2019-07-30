import 'jest'
import co, { watch, read, isLinkedState, isCostate, Costate } from '../src/costate'

const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout))

describe('co', () => {
  it('can be watched and unwatched', done => {
    let costate = co({ count: 0 })

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

  it('works correctly with object', done => {
    let costate = co({ count: 0 })

    let comsumer = async () => {
      let count = 0
      for await (let state of costate) {
        count += 1
        expect(state.count).toEqual(count)
        if (count >= 10) {
          done()
          return
        }
      }
    }

    let provider = async () => {
      for (let i = 0; i < 10; i++) {
        await delay()
        costate.count += 1
      }
    }

    // tslint:disable-next-line: no-floating-promises
    comsumer()
    // tslint:disable-next-line: no-floating-promises
    provider()
  })

  it('works correctly with array', done => {
    let colist = co([] as number[])

    let comsumer = async () => {
      let count = 0
      for await (let list of colist) {
        count += 1

        for (let i = 0; i < count; i++) {
          expect(list[i]).toBe(i)
        }

        if (count >= 10) {
          done()
          return
        }
      }
    }

    let provider = async () => {
      for (let i = 0; i < 10; i++) {
        await delay()
        colist.push(i)
      }
    }

    // tslint:disable-next-line: no-floating-promises
    comsumer()
    // tslint:disable-next-line: no-floating-promises
    provider()
  })

  it('works correctly with nest structure', done => {
    let costate = co({ counts: [] as number[] })

    let comsumer = async () => {
      let count = 0
      for await (let state of costate) {
        count += 1

        for (let i = 0; i < count; i++) {
          expect(state.counts[i]).toBe(i)
        }

        if (count >= 10) {
          done()
          return
        }
      }
    }

    let provider = async () => {
      for (let i = 0; i < 10; i++) {
        await delay()
        costate.counts.push(i)
      }
    }

    // tslint:disable-next-line: no-floating-promises
    comsumer()
    // tslint:disable-next-line: no-floating-promises
    provider()
  })

  it('can detect delete property', done => {
    let costate = co({ a: 1, b: 2 })

    watch(costate, state => {
      expect(state.hasOwnProperty('b')).toBe(false)
      done()
    })

    expect(costate.hasOwnProperty('b')).toBe(true)

    delete costate.b

    expect(costate.hasOwnProperty('b')).toBe(false)
  })

  it('can support multiple keys has the same costate', done => {
    let cochild = co({ a: 1, b: 2 })
    let coparent = co({ child1: cochild, child2: cochild })

    watch(coparent, state => {
      expect(state.child1 === state.child2).toBe(true)
      expect(state).toEqual({
        child1: {
          a: 1,
          b: 1
        },
        child2: {
          a: 1,
          b: 1
        }
      })
      done()
    })

    cochild.b -= 1
  })

  it('should support debounce', done => {
    let costate = co({ count: 0 })

    watch(costate, state => {
      expect(state.count).toBe(10)
      done()
    })

    for (let i = 0; i < 10; i++) {
      costate.count += 1
    }
  })

  it('can be read and detect', () => {
    let costate = co({ count: 0 })
    let state = read(costate)

    expect(isCostate(costate)).toBe(true)
    expect(isCostate({ count: 0 })).toBe(false)

    expect(isLinkedState(state)).toBe(true)
    expect(isLinkedState({ count: 0 })).toBe(false)

    expect(state).toEqual({ count: 0 })

    expect(co(state) === costate).toBe(true)
  })

  it('object state derived by costate should be immutable', () => {
    let costate = co({ a: { value: 1 }, b: { value: 1 }, c: { value: 1 } })
    let state0 = read(costate)

    costate.a.value += 1
    let state1 = read(costate)

    costate.b.value += 1
    let state2 = read(costate)

    costate.c.value += 1
    let state3 = read(costate)

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
    let colist = co([{ value: 1 }, { value: 1 }, { value: 1 }])
    let list0 = read(colist)

    colist[0].value += 1
    let list1 = read(colist)

    colist[1].value += 1
    let list2 = read(colist)

    colist[2].value += 1
    let list3 = read(colist)

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
    let list4 = read(colist)

    expect(list4 !== list3).toBe(true)
    expect(list4[0] === list3[0]).toBe(true)
    expect(list4[1] === list3[1]).toBe(true)
    expect(list4[2] === list3[2]).toBe(true)

    expect(list3).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])
    expect(list4).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }, { value: 1 }])

    colist.pop()
    let list5 = read(colist)

    expect(list5 !== list3).toBe(true)
    expect(list5[0] === list3[0]).toBe(true)
    expect(list5[1] === list3[1]).toBe(true)
    expect(list5[2] === list3[2]).toBe(true)

    expect(list3).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])
    expect(list5).toEqual([{ value: 2 }, { value: 2 }, { value: 2 }])
  })
})
