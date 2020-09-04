'use strict'
/* global BigInt: false */

// const Sheet = require('./Sheet')

/** @type {function(...)} can be set via profSetup() */
let assert

/** @type {boolean} can be set via profOn() to control access to rest of the API. */
let isEnabled = true

let getTime

//  number or BigInt values to make math work and to normalize totals.
let step, timeScale, zeroDuration

let measures = [], pending = [], threads = []

function Measure (tag) {
  this.entries = []
  this.n = zeroDuration
  this.tag = tag
}

Measure.prototype.add = function (time, path) {
  this.entries.push(path ? [time, path.join('>')] : [time])
  this.n += step
  return this
}

/** @returns {number} */
Measure.prototype.count = function () {
  return this.n
}

/** @returns {Object} */
Measure.prototype.leaks = function () {
  const dict = {}
  let count = 0

  this.entries.forEach(([, leaked]) => {
    if (leaked) (dict[leaked] = (dict[leaked] || 0) + 1) && ++count
  })
  return { ...dict, count }
}

Measure.prototype.mean = function () {
  return this.total() / this.count()
}

/** @returns {BigInt|number} */
Measure.prototype.total = function () {
  return this.entries.reduce((a, r) => a + r[0], zeroDuration) / timeScale
}

function ThreadAcc (tag) {
  this.tag = tag
  this.t = zeroDuration
  this.n = zeroDuration
}

ThreadAcc.prototype.count = function () {
  return this.n
}

ThreadAcc.prototype.leaks = () => ({ count: 0 })

ThreadAcc.prototype.total = function () {
  return this.t / timeScale
}

ThreadAcc.prototype.mean = function () {
  return this.total() / this.n
}

/** @returns {Measure} */
const newMeasure = (tag) => {
  const r = new Measure(tag)
  measures.push(r)
  return r
}

/** @type {number} index set by findByTag() function */
let foundIndex

const findByTag = (tag, array) => {
  foundIndex = undefined
  return array.find((r, i) => r.tag === tag && ((foundIndex = i) || true))
}

/**
 * Get path from top to given index in pending entries.
 * @param {number} index
 * @returns {string[]}
 */
const getPathTo = (index) => {
  return pending.slice(0, index + 1).map(({ tag }) => tag)
}

const profThreadBegin = (tag, id) => {
  assert(tag && typeof tag === 'string' && tag.indexOf('#') < 0, 'profThreadBegin(): invalid tag')
  const name = tag + '#' + id, tg = '>' + tag
  assert(!findByTag(name, threads), 'profThreadBegin(' + name + '): doubled')

  if (!findByTag(tg, measures)) measures.push(new ThreadAcc(tg))
  threads.push({ tag: name, t0: getTime() })
  return true
}

const profThreadEnd = (tag, id) => {
  const acc = findByTag('>' + tag, measures), name = tag + '#' + id
  const rec = findByTag(name, threads)

  assert(rec, 'profThreadEnd(' + name + '): no thread')
  threads.splice(foundIndex, 1)
  acc.t += getTime() - rec.t0
  acc.n += step
  return true
}

/**
 * Unless `threadId` is given, push { tag, t0 } entry to `pending` stack.
 * @param {string} tag
 * @param {*=} threadId
 * @returns {boolean|number}
 */
const profBegin = (tag, threadId = undefined) => {
  if (!isEnabled) return true
  if (threadId !== undefined) return profThreadBegin(tag, threadId)
  assert(tag && typeof tag === 'string' && tag.indexOf('>') < 0, 'profBegin(): invalid tag')
  const r = findByTag(tag, pending)
  assert(!r, 'profBegin(' + tag + '): tag is still open')
  return pending.push({ tag, t0: getTime() })
}

/**
 * Close the pending entry and increase existing accumulator.
 * @param {string|boolean} tag
 * @param {*=} threadId
 * @returns {boolean} always true
 */
const profEnd = (tag, threadId = undefined) => {
  if (isEnabled) {
    if (threadId !== undefined) return profThreadEnd(tag, threadId)

    const t1 = getTime()
    let j = 0, measure, realTag = tag

    assert(pending.length || tag === true, 'profEnd(' + tag + '): nothing to end')

    if (tag === true) {
      realTag = (pending[0] && pending[0].tag) || '???'
      threads = []
    } else {
      const r = findByTag(tag, pending)
      assert(r, 'profEnd(' + tag + '): no such entry')
      j = foundIndex
    }

    for (let i = pending.length; --i >= j;) {
      const path = (tag === true || i > j) && getPathTo(i)
      const { t0 } = pending.pop()
      if (!measure) measure = findByTag(realTag, measures) || newMeasure(realTag)
      measure.add(t1 - t0, path)    //  NB: `path` is set only if there were open entries.
    }
  }
  return true
}

/**
 * Clear all pending entries and matching or all measures.
 * @param {RegExp=} rx to test measure tags.
 * @returns {boolean} always true.
 */
const profReset = (rx = undefined) => {
  if (isEnabled) {
    if (rx) {
      for (let i = measures.length; --i >= 0;) {
        if (rx.test(measures[i].tag)) measures.splice(i, 1)
      }
    } else {
      measures = []
    }
    pending = []
  }
  return true
}

/**
 * @returns {number} current depth.
 */
const profDepth = () => pending.length

/**
 * @returns {Object[]} sorted array of measures.
 */
const profResults = (sortBy = 'total') => {
  if (!isEnabled) return []

  return measures.slice().sort((a, b) => {
    const v = b[sortBy]() - a[sortBy]()
    if (v === 0n || v === 0) return 0
    return v > 0n ? 1 : -1
  })
}

const profSetup = (options = undefined) => {
  const old = { getTime, timeScale }

  if (options) {
    if (options.assert) assert = options.assert    //  Useful for initialization.
    assert(pending.length === 0 && measures.length === 0 && threads.length === 0,
      'Setup() while operating')
    if (options.getTime) getTime = options.getTime
    const big = typeof getTime() !== 'number'
    timeScale = options.timeScale || (big ? BigInt(1e3) : 1)
    zeroDuration = big ? 0n : 0
    step = big ? 1n : 1
  }
  return old
}

/**
 * Enable / disable the profiler API.
 * @param {boolean|undefined} yes
 * @returns {boolean} earlier state.
 */
const profOn = (yes = undefined) => {
  const old = isEnabled
  if (yes !== undefined) {
    assert(yes || !(pending.length || threads.length), 'profOn(false) in pending state')
    isEnabled = yes
  }
  return old
}

// const profTexts = (sortBy = 'mean') => {
//   const sheet = new Sheet({ minWidth: 7 })
//
//   sheet.header = ['tag', 'mean', 'count', 'total']
//   profResults(sortBy).forEach((r) => {
//     let l = r.leaks()
//
//     sheet.append([r.tag, r.mean(), r.count(), r.total()])
//     if (l.count) {
//       delete l.count
//       Object.keys(l).forEach(k => sheet.append('  LEAK: ' + k + ': ' + l[k]))
//     }
//   })
//   return sheet.dump()
// }

module.exports = {
  profBegin,
  profDepth,
  profEnd,
  profOn,
  profReset,
  profResults,
  profSetup
}

