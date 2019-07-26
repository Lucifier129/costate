import costate from '../src/costate'

describe('costate', () => {
  it('works correctly', done => {
    let list$ = costate([])

    let timer

    let comsumer = async () => {
      let count = 0
      for await (let list of list$) {
        count += 1
        if (count > 10) {
          clearInterval(timer)
          expect(list.length).toEqual(10)
          done()
          return
        }
      }
    }

    let provider = () => {
      timer = setInterval(() => {
        list$.push({ count: { value: Math.random() } })
        let target = list$[list$.length - 1]
        delete target.count
      }, 10)
    }

    comsumer()
    provider()
  })
})
