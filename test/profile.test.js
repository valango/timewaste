'use strict'
const { profBegin, profDepth, profEnd, profOn, profReset, profResults, profSetup, profTexts } =
        require('..')

const delay = (t) => new Promise(resolve => {
  setTimeout(resolve, t)
})

let time = 0
const getTime = () => time

const print = () => undefined
// const print = str => process.stdout.write(str + '\n')

const tests = () => {
  it('should handle main case', () => {
    expect(Object.keys(profSetup({ getTime }))).toEqual(['getTime', 'pureDuration', 'timeScale'])
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
    // profTexts().forEach(r => print(r))
    // expect(profTexts().length).toBe(3)
  })

  it('should reset', () => {
    profReset(/^a/)
    expect(profResults('count').length).toBe(2)
    profReset()
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

  it('should handle leaks', () => {
    profReset()
    profBegin('a') && profBegin('b') && profBegin('c')
    profEnd('a')
    expect(profResults()[0].leaks().count).toBe(2)
    // profTexts().forEach(r => print(r))
    // expect(profTexts().length).toBe(3)
    profReset()   //  Here to clear measures.
  })

  it('should handle total leak', () => {
    profReset()
    profBegin('a') && profBegin('b') && profBegin('c')
    profEnd(true)
    expect(profResults()[0].leaks().count).toBe(3)
    // profTexts().forEach(r => print(r))
    // expect(profTexts().length).toBe(4)
    profReset()   //  Here to clear measures.
  })
}

describe('back-end mode', tests)

describe('front-end mode', () => {
  beforeAll(() => profSetup({ getTime: Date.now }))

  tests()
})
