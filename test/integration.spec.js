//  This si integration test, not module test.
'use strict'

const _ = require('lodash')
const standard = require('../src')
const { P_TAG, P_AVG } = standard
// const factory = require('../src/profiler')
const run = require('./run')

const N_THREADS = 2
// const tags = 'abcdefghij'.split(''), nTags = tags.length
const tags = 'ab'.split(''), nTags = tags.length

const statNormal = {
  callDepth: 0,
  enabled: true,
  errorCount: 0,
  leakCount: 0,
  measureCount: nTags,
  threadCount: 0
}

const statExtras = {
  errors: [],
  leaks: [],
  openCalls: [],
  threadLengths: []
}

const isSortedBy = (field, measures) => {
  for (let last = 0, i = measures.length, v; --i >= 0; last = v) {
    v = measures[i][field]
    if (field === P_TAG ? v > last : v < last) {
      return false
    }
  }
  return true
}

//  Create a failure callback
const mk2failAt = (cycle, it) => ((c, i) => {
    if (c === cycle && (it === undefined || i === it)) return true
  }
)


const tests = (profiler) => {
  let options = { profiler, tags, threads: N_THREADS - 1 }
  let results, res

  it('should do beg/end', () => {
    res = run(options)

    expect(res.duration).toBeGreaterThan(0n)
    expect(res.ops).toBeGreaterThan(0n)
    expect(res.responses.size).toBe(nTags * 2 * N_THREADS)
    // console.log(res.responses)
  })

  it('should get stats', () => {
    res = profiler.profStatus()
    expect(res).toEqual(statNormal)
    res = profiler.profStatus(true)
    expect(res).toEqual({ ...statNormal, ...statExtras })
    // console.log(res)
  })

  it('should get results', () => {
    results = profiler.profResults()
    expect(Object.keys(results)).toEqual(['measures'])
    expect(results.measures.length).toBe(nTags)
    expect(isSortedBy(P_AVG, results.measures)).toBe(true)
    res = profiler.profResults()
    expect(Object.keys(res)).toEqual(['measures'])
    expect(res.measures.length).toBe(0)
    res = profiler.profResults(results, P_TAG)
    expect(isSortedBy(P_TAG, res.measures)).toBe(true)
    // console.log(res)
  })

  it('should get texts', () => {
    res = profiler.profTexts()
    expect(res.length).toBeLessThan(5)
    res = profiler.profTexts(results)
    expect(res.length).toBeGreaterThan(3 + nTags)
    // console.log(res)
  })

  it('profEnable()', () => {
    expect(profiler.profEnable(0)).toBe(true)
    const res = run(options)
    expect(res.responses.size).toBe(0)
    expect(profiler.profStatus()).toEqual(
      _.defaults({ enabled: false, measureCount: 0 }, statNormal))
    expect(profiler.profEnable(1)).toBe(false)
    expect(profiler.profEnable()).toBe(true)
    // console.log(profiler.profStatus(true))
    // console.log(profiler.profResults())
  })

  it('profEnable(false) should fail in the middle', () => {
    profiler.profSetup({ reset: true })  //  Reset data - any option would do.
    run({ failAt: mk2failAt(nTags + 1, 1), ...options })
    res = profiler.profStatus()
    expect(res).toEqual(_.defaults({ leakCount: 1 }, statNormal))

    profiler.profSetup({ reset: true })  //  Reset data - any option would do.
    run({ failAt: mk2failAt(nTags + 2, 1), ...options })
    res = profiler.profStatus()
    expect(res).toEqual(_.defaults({ threadCount: 1 }, statNormal))

    profiler.profSetup({ reset: true })  //  Reset data - any option would do.
    run({ failAt: mk2failAt(nTags + 2), ...options })
    res = profiler.profStatus()
    expect(res).toEqual(_.defaults({ callDepth: 1, threadCount: 1 }, statNormal))
  })
}

describe('back-end', () => {
  tests(standard)
})
