'use strict'
const { profBegin, profDepth, profEnd, profOn, profReset, profResults, profSetup, profTexts } =
        require('..')

let printed = [], time = 0
const myGetTime = () => time
let { getTime } = profSetup()

const print = str => printed.push(str)
const reset = (rx = undefined) => {
  profReset(rx)
  printed = []
}

const tests = () => {
  it('should handle main case', () => {
    expect(Object.keys(profSetup({ getTime: myGetTime })))
      .toEqual(['getTime', 'pureDuration', 'timeScale'])
    expect(profOn()).toBe(true)
    profEnd(true)     //  Should not throw.
    expect(profOn(true)).toBe(true)
    time = 2
    expect(profBegin('a') && profBegin('b')).toBe(2)
    time = 4
    expect(profEnd('b') && profBegin('b')).toBe(2)
    time = 6
    profBegin('fun', 1)
    profEnd('b')
    time = 8
    profEnd('fun', 1)
    profEnd('a')
    // const r = profResults()
    // r.forEach(o => console.log(o.tag, o.entries))
    expect(profDepth()).toBe(0)
    profTexts().forEach(r => print(r))
    expect(profTexts().length).toBe(3)
  })

  it('should reset', () => {
    reset(/^a/)
    expect(profResults('count').length).toBe(2)
    reset()
    expect(profResults().length).toBe(0)
  })

  it('should switch off', () => {
    expect(profOn(false)).toBe(true)
    expect(profBegin('a') && profBegin('a') && profBegin('b')).toBe(true)
    expect(profEnd('a')).toBe(true)
    expect(profResults().length).toBe(0)
    expect(profOn(true)).toBe(false)
  })

  it('should throw on errors', () => {
    expect(() => profBegin([])).toThrow('invalid tag')
    expect(() => profBegin()).toThrow('invalid tag')
    profBegin('a')
    expect(() => profOn(false)).toThrow('pending')
  })

  it('should handle entry leaks', () => {
    reset()
    profSetup({ getTime })
    profBegin('a') && profBegin('b') && profBegin('c')
    profEnd('a')
    expect(profResults()[0].leaks().count).toBe(2)
    profTexts().forEach(r => print(r))
    expect(printed.length).toBe(3)
  })

  it('should handle thread leaks', () => {
    reset()
    profBegin('a', 1) && profBegin('b', 2) && profBegin('c', 3)
    profEnd('b', 2)
    profTexts('mean').forEach(r => print(r))
    expect(printed.length).toBe(3)
  })

  it('should handle total leak', () => {
    reset()
    profBegin('a') && profBegin('b') && profBegin('c')
    profEnd(true)

    expect(profResults()[0].leaks().count).toBe(3)
    profTexts().forEach(r => print(r))
    expect(printed.length).toBe(4)
  })
}

describe('back-end mode', tests)

describe('front-end mode', () => {
  beforeAll(() => {
    reset()
    getTime = Date.now
    profSetup({ getTime })
  })

  tests()
})
