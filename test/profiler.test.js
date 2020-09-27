'use strict'
const profiler = require('..')
const _ = require('lodash')
const U = undefined
const HEAD_LENGTH = 4  //  profTexts() in empty state -> [empty, 'RESULTS', header, line]

const dfltStatus = {
  callDepth: 0,
  enabled: true,
  errorCount: 0,
  leakCount: 0,
  measureCount: 0,
  threadCount: 0
}

const dfltLongStatus = {
  errors: [],
  leaks: [],
  openCalls: [],
  threadLengths: [],
  ...dfltStatus
}

const dummyMeasures = [['c', 3], ['a', 4], ['b', 5]]
let defaults

//  Helper functions

const beg = (t, tags, threadId = undefined) => {
  return Array.from(tags).map(tag => t.profBeg(tag, threadId))
}

const end = (t, handles, threadId = undefined) => {
  return handles.map(h => t.profEnd(h, threadId))
}

const tests = (t) => {
  let res

  it('should be initialized', () => {
    expect(t.profEnable()).toEqual(true)
    expect(t.profPendingCount()).toBe(0)
    expect(t.profSetup()).toEqual(defaults)
    expect(t.profStatus()).toEqual(dfltStatus)
    expect(t.profStatus(true)).toEqual(dfltLongStatus)
    expect(t.profResults()).toEqual({ measures: [] })
    expect(t.profTexts().length).toBe(HEAD_LENGTH)
  })

  it('should register entries', () => {
    expect(beg(t, 'abc')).toEqual([1, 2, 3])
    expect(t.profStatus()).toEqual(
      { ...dfltStatus, callDepth: 3, measureCount: 3 })
  })

  it('should register thread entries', () => {
    expect(beg(t, 'abc', 10)).toEqual([1, 2, 3])
    expect(beg(t, 'abc', 12)).toEqual([1, 2, 3])
    expect(t.profStatus()).toEqual(
      { ...dfltStatus, callDepth: 3, measureCount: 3, threadCount: 2 })
    // expect(t.profStatus(true).openCalls).toEqual(['a', 'b', 'c'])
  })

  it('should dispose some threads', () => {
    expect(end(t, [3, 2, 1], 10)).toEqual([true, true, true])
    expect(t.profStatus()).toEqual(
      { ...dfltStatus, callDepth: 3, measureCount: 3, threadCount: 1 })
    expect(beg(t, 'abc', 10)).toEqual([1, 2, 3])
    expect(end(t, [3, 2, 1])).toEqual([true, true, true])
    end(t, beg(t, 'b')) && end(t, beg(t, 'b'))    //  Create fractional entries.
    expect(t.profStatus()).toEqual(
      { ...dfltStatus, measureCount: 3, threadCount: 2 })
  })

  it('should disable/enable', () => {
    expect(t.profEnable(false)).toBe(true)
    expect(t.profEnable()).toEqual(false)
    expect(t.profStatus()).toEqual(
      { ...dfltStatus, enabled: false, measureCount: 3, threadCount: 2 })
    expect(beg(t, 'q')).toEqual([U])
    expect(beg(t, 'q', 10)).toEqual([U])
    expect(end(t, [3], 10)).toEqual([U])
    expect(end(t, [3])).toEqual([U])
    expect(t.profEnable(true)).toBe(false)
    expect(t.profStatus()).toEqual(
      { ...dfltStatus, measureCount: 3, threadCount: 2 })
    expect(t.profEnable()).toEqual(true)
  })

  it('should get res', () => {
    res = t.profResults()
    expect(Object.keys(res)).toEqual(['measures'])
    expect(res.measures.length).toBe(3)
    expect(t.profResults(t.P_NONE, { measures: dummyMeasures }).measures)
      .toEqual(dummyMeasures)
    expect(t.profResults(0, { measures: dummyMeasures }).measures)
      .toEqual([['a', 4], ['b', 5], ['c', 3]])
    expect(t.profResults(1, { measures: dummyMeasures }).measures)
      .toEqual([['b', 5], ['a', 4], ['c', 3]])
  })

  it('should get texts', () => {
    let lines = t.profTexts(res)
    // console.log(lines)
    expect(lines.length).toBe(HEAD_LENGTH + 3)
    expect(lines[2]).toMatch(/^tag\s+count\s+avg\s+time\s+total_avg\s+total_time$/)
    expect(t.profTexts(res, [-2, 4, 2])[2]).toMatch(/^tag\s+avg\s+total_avg$/)
    expect(t.profTexts(res, [-4, -1, -5])[2]).toMatch(/^tag\s+avg\s+time$/)
  })

  it('should throw on bad calls', () => {
    expect(() => t.profBeg()).toThrow('llegal tag')
    expect(() => t.profBeg('a b')).toThrow('llegal tag')
    expect(() => t.profResults(0, 1)).toThrow('bad arguments')
    expect(() => t.profResults([0], [1])).toThrow('bad arguments')
    expect(() => t.profTexts(0, [[0]], [[2]])).toThrow('bad arguments')
  })

  it('should set internal error condition', () => {
    t.profSetup({})
    beg(t, 'a', 2)
    expect(end(t, [1, 1, 1])).toEqual([false, false, false])
    expect(end(t, [2, 2], 3)).toEqual([false, false])
    beg(t, 'xyz')       //  Open entry in main thread should block enable(false)
    beg(t, 'y')         //  Should create a leak.
    expect(t.profEnable(false)).toBe(undefined)
    expect(t.profEnable()).toBe(true)
    const st = t.profStatus(true)
    expect(st.errors.map(e => e.message)).toEqual([
      'profEnd: no entry: 1', 'profEnd: no thread: 2', 'profEnable(false): there are calls pending'
    ])
    delete st.errors
    expect(st).toEqual({
      ...dfltStatus,
      ...{
        callDepth: 1, errorCount: 3, leakCount: 2, measureCount: 4, threadCount: 1,
        leaks: [['x y z', 1], ['x y', 1]], openCalls: ['x'], threadLengths: [[2, 1]]
      }
    })
    expect(t.profTexts().findIndex(l => l.indexOf('*** ERROR') === 0)).toBe(1)
  })

  it('should leak a secondary thread', () => {
    t.profSetup({})
    t.profEnable(true)
    expect(t.profStatus()).toEqual(dfltStatus)
    expect(beg(t, 'ab')).toEqual([1, 2])
    expect(beg(t, 'abb', 10)).toEqual([1, 2, false])
    expect(end(t, [2, 1])).toEqual([true, true])
    expect((res = t.profResults()).leaks).toEqual([['a b', 1]])
    expect(t.profTexts(res).findIndex(l => l.indexOf('*** LEAKS') === 0)).toBe(1)
  })
}

describe('back-end mode', () => {
  defaults = _.clone(profiler.profSetup())
  tests(profiler)
})

describe('front-end mode', () => {
  beforeAll(() => {
    profiler.profSetup({ getTime: defaults.getTime = Date.now })
  })

  tests(profiler)
})
