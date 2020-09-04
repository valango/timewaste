'use strict'
const { profBegin, profDepth, profEnd, profOn, profReset, profResults, profSetup, profTexts } = require(
  '../profile')

const delay = (t) => new Promise(resolve => {
  setTimeout(resolve, t)
})

const print = ()=>undefined
// const print = str => process.stdout.write(str + '\n')

const tests = () => {
  it('should handle main case', async () => {
    expect(Object.keys(profSetup())).toEqual(['getTime', 'timeScale'])
    expect(profOn()).toBe(true)
    profEnd(true)     //  Should not throw.
    expect(profOn(true)).toBe(true)
    expect(profBegin('a') && profBegin('b')).toBe(2)
    expect(profEnd('b') && profBegin('b')).toBe(2)
    profBegin('fun', 1)
    await delay(10)
    profEnd('b')
    await delay(5)
    profEnd('fun', 1)
    profEnd('a')
    expect(profDepth()).toBe(0)
    profTexts().forEach(r => print(r))
    expect(profTexts().length).toBe(3)
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
    profTexts().forEach(r => print(r))
    expect(profTexts().length).toBe(3)
    profReset()   //  Here to clear measures.
  })

  it('should handle total leak', () => {
    profReset()
    profBegin('a') && profBegin('b') && profBegin('c')
    profEnd(true)
    expect(profResults()[0].leaks().count).toBe(3)
    profTexts().forEach(r => print(r))
    expect(profTexts().length).toBe(4)
    profReset()   //  Here to clear measures.
  })
}

describe('back-end mode', tests)

describe('front-end mode', () => {
  beforeAll(() => profSetup({ getTime: Date.now }))

  tests()
})
