'use strict'
//  This code needs to be improved: in order to minimize the Garbage Collection
// overhead, we do not pop() or splice() the static arrays.
// However, because use of classes, the problem still persists.

const Sheet = require('./Sheet')

/** @type {boolean} can be set via profOn() to control access to rest of the API. */
let isEnabled = true

//  The following variables can be read and mutated via profSetup() function.

/** @type {function(...)} */
let assert

/** @type {boolean} controls if we gather accumulated ot pure execution time. */
let pureDuration = false

/** @type {function():*} time query function returning a number or bigint value. */
let getTime

//  number or BigInt values to make math work and to normalize totals.
let step, timeScale, zeroDuration

/** @type {Array<Measure|ThreadAcc>} */
const measures = []
/**
 * Open entries
 * @type {Array<{tag: string, t0:*}>}
 */
const pending = []
/** @type {Array<{tag: string, t0:*}>} */
const threads = []

/** Add element to array */
const arrayAdd = (array, entry) => {
  const i = array.findIndex(v => v === undefined)
  if (i >= 0) { array[i] = entry } else array.push(entry)
}

/** @returns {number} of elements in use */
const arrayUsed = (array) => {
  return array.reduce((a, entry) => entry ? a + 1 : a, 0)
}

/** @type {number} index set by findByTag() function */
let foundAt

/** @returns {Object|undefined}, mutates `foundAt` */
const findByTag = (tag, array) => {
  foundAt = undefined
  return array.find((r, i) => r && r.tag === tag && ((foundAt = i) || true))
}

/**
 * Synchronous calls accumulator.
 * Created when closing the first entry<tag> by profEnd().
 */
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

//  Negative return value means pending while closed.
Measure.prototype.mean = function () {
  return this.total() / this.count()
}

/** @returns {BigInt|number} */
Measure.prototype.total = function () {
  return this.entries.reduce((a, entry) => a + entry[0], zeroDuration) / timeScale
}

/**
 * Asynchronous calls accumulator.
 * Created when pushing the first thread<tag> by profThreadBegin().
 */
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

//  Negative return value means pending while closed.
ThreadAcc.prototype.mean = function () {
  return this.n ? this.total() / this.n : -step
}

/** @returns {Measure} */
const newMeasure = (tag) => {
  const r = new Measure(tag)
  measures.push(r)
  return r
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

  if (!findByTag(tg, measures)) arrayAdd(measures, new ThreadAcc(tg))
  arrayAdd(threads, { tag: name, t0: getTime() })
  return true
}

const profThreadEnd = (tag, id) => {
  const acc = findByTag('>' + tag, measures), name = tag + '#' + id
  const rec = findByTag(name, threads)

  assert(rec, 'profThreadEnd(' + name + '): no thread')
  threads[foundAt] = undefined
  acc.t += getTime() - rec.t0
  acc.n += step
  return true
}

//  -------------------------------  Exported API -------------------------------

/**
 * Unless `threadId` is given, push { tag, t0 } entry to `pending` stack.
 *
 * @param {string} tag - unique tag, must not contain '>' character.
 * @param {*=} threadId - numeric to be used with threads.
 * @returns {boolean} true when API was enabled.
 */
const profBegin = (tag, threadId = undefined) => {
  if (!isEnabled) return false
  if (threadId !== undefined) return profThreadBegin(tag, threadId)
  assert(tag && typeof tag === 'string' && tag.indexOf('>') < 0, 'profBegin(): invalid tag')
  const r = findByTag(tag, pending)
  assert(!r, foundAt + 'profBegin(' + tag + '): tag is still open')
  arrayAdd(pending, { tag, t0: getTime() })
  return true
}

/**
 * Close the pending entry and increase existing accumulator.
 *
 * @param {string|boolean} tag
 * @param {*=} threadId
 * @returns {boolean} always true
 */
const profEnd = (tag, threadId = undefined) => {
  if (!isEnabled) return false

  if (threadId !== undefined) return profThreadEnd(tag, threadId)

  const t1 = getTime()
  let duration, j = 0, measure, realTag = tag

  assert(arrayUsed(pending) || tag === true, 'profEnd(' + tag + '): nothing to end')

  if (tag === true) {
    realTag = (pending[0] && pending[0].tag) || '???'
    threads.forEach((v, i) => (threads[i] = undefined))
  } else {
    const r = findByTag(tag, pending)
    assert(r, 'profEnd(' + tag + '): no such entry')
    j = foundAt
  }

  for (let i = arrayUsed(pending); --i >= j;) {
    const path = (tag === true || i > j) && getPathTo(i)
    const { t0 } = pending[i]
    pending[i] = undefined
    if (!measure) measure = findByTag(realTag, measures) || newMeasure(realTag)
    if (pureDuration) duration = duration === undefined ? t1 - t0 : duration + t1 - t0
    measure.add(t1 - t0, path)    //  NB: `path` is set only if there were open entries.
  }
  if (duration) pending.forEach(r => r && (r.t0 += duration))

  return true
}

/**
 * Clear all pending entries and matching or all measures.
 *
 * @param {RegExp=} rx to test measure tags.
 * @returns {boolean} always true.
 */
const profReset = (rx = undefined) => {
  if (isEnabled) {
    if (rx) {
      for (let i = measures.length; --i >= 0;) {
        if (measures[i] && rx.test(measures[i].tag)) measures[i] = undefined
      }
    } else {
      measures.forEach((v, i) => (measures[i] = undefined))
    }
    pending.forEach((v, i) => (pending[i] = undefined))
    threads.forEach((v, i) => (threads[i] = undefined))
  }
  return true
}

/**
 * @returns {number} current depth of synchronous calls.
 */
const profDepth = () => {
  const i = pending.findIndex(v => v === undefined)
  return i >= 0 ? i : pending.length
}

/**
 * @returns {Object[]} sorted array of resulting measures.
 */
const profResults = (sortBy = 'total') => {
  if (!isEnabled) return []

  return measures.filter(v => v).sort((a, b) => {
    const v = b[sortBy]() - a[sortBy]()
    if (v === 0n || v === 0) return 0
    return v > 0n ? 1 : -1
  })
}

/**
 * Enable / disable the profiler API.
 *
 * @param {boolean|undefined} yes
 * @returns {boolean} earlier state.
 */
const profOn = (yes = undefined) => {
  const old = isEnabled
  if (yes !== undefined) {
    assert(yes || !(arrayUsed(pending) || arrayUsed(threads)), 'profOn(false) in pending state')
    isEnabled = yes
  }
  return old
}

/**
 * Change or just read options in effect.
 *
 * @param {Object=} options
 * @returns {{assert, getTime, pureDuration, timeScale}}
 */
const profSetup = (options = undefined) => {
  const old = { assert, getTime, pureDuration, timeScale }

  if (options) {
    if (options.assert) assert = options.assert    //  Useful for initialization.
    assert(arrayUsed(pending) === 0 && arrayUsed(measures) === 0 && arrayUsed(threads) === 0,
      'profSetup() while operating')
    if (options.getTime) getTime = options.getTime
    if (options.pureDuration !== undefined) pureDuration = options.pureDuration
    const big = typeof getTime() !== 'number'
    timeScale = options.timeScale || (big ? BigInt(1e3) : 1)
    zeroDuration = big ? 0n : 0
    step = big ? 1n : 1
  }
  return old
}

/**
 * Compose results as pretty-formatted text array.
 *
 * @param {string=} sortBy - name of attribute to sort by (defaults to 'mean')
 * @returns {string[]}
 */
const profTexts = (sortBy = 'mean') => {
  const sheet = new Sheet({ minWidth: 7 })

  sheet.header = ['tag', 'mean', 'count', 'total']

  profResults(sortBy).forEach((r) => {
    const leaks = r.leaks()

    sheet.append([r.tag, r.mean(), r.count(), r.total()])
    if (leaks.count) {
      delete leaks.count
      Object.keys(leaks).forEach(k => sheet.append('  LEAK: ' + k + ': ' + leaks[k]))
    }
  })
  return sheet.dump()
}

module.exports = {
  profBegin,
  profDepth,
  profEnd,
  profOn,
  profReset,
  profResults,
  profSetup,
  profTexts
}

