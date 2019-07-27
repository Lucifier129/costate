import co from '../src'

describe('costate', () => {
  it('works correctly', done => {
    type item = {
      count: { value: number }
    }
    let colist = co([] as item[])

    let timer

    let comsumer = async () => {
      let count = 0
      for await (let list of colist) {
        count += 1
        if (count >= 10) {
          clearInterval(timer)
          expect(list.length).toEqual(10)
          done()
          return
        }
      }
    }

    let provider = () => {
      timer = setInterval(() => {
        colist.push({ count: { value: Math.random() } })
        let target = colist[colist.length - 1]
        delete target.count
      }, 10)
    }

    comsumer()
    provider()
  })
})
