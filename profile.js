'use strict'
/* global BigInt: false */

// const Sheet = require('./Sheet')
console.log("PROFILE")
let assert
let getTime, timeScale, T0, step

let isEnabled = process.env.NODE_ENV !== 'production'
let measures = [], pending = [], threads = []

function Measure (tag) {
  this.entries = []
  this.n = T0
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
  return this.entries.reduce((a, r) => a + r[0], T0) / timeScale
}

function ThreadAcc (tag) {
  this.tag = tag
  this.t = T0
  this.n = T0
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

let foundIndex

const findByTag = (tag, array) => array.find((r, i) => r.tag === tag && ((foundIndex = i) || true))

const getPathTo = (j) => {
  return pending.slice(0, j + 1).map(({ tag }) => tag)
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
  const acc = findByTag('>' + tag, measures), name = tag + '#' + id, r = findByTag(name, threads)
  assert(r, 'ThreadEnd(' + name + '): no thread')
  threads.splice(foundIndex, 1)
  acc.t += getTime() - r.t0
  acc.n += step
  return true
}

const profBegin = (tag, id = undefined) => {
  if (!isEnabled) return true
  if (id !== undefined) return profThreadBegin(tag, id)
  assert(tag && typeof tag === 'string' && tag.indexOf('>') < 0, 'Begin(): invalid tag')
  const r = findByTag(tag, pending)
  assert(!r, 'Begin(' + tag + '): tag is still open')
  return pending.push({ tag, t0: getTime() })
}

const profEnd = (tag, id = undefined) => {
  if (isEnabled) {
    if (id !== undefined) return profThreadEnd(tag, id)
    const t1 = getTime()
    let j = 0, r = pending[0]
    assert(pending.length || tag === true, 'End(' + tag + '): nothing to end')

    if (tag === true) {
      threads = []
    } else {
      r = findByTag(tag, pending)
      j = foundIndex
      assert(r, 'End(' + tag + '): no such entry')
    }
    //  If we weren't at the last entry, then terminate those, too.
    for (let i = pending.length; --i >= j;) {
      const path = (tag === true || i > j) && getPathTo(i)
      const { t0 } = pending.pop()
      const measure = findByTag(tag, measures) || newMeasure(tag)
      measure.add(t1 - t0, path)
    }
  }
  return true
}

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

const profDepth = () => pending.length

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
    if(options.assert) assert = options.assert    //  Useful for initialization.
    assert(pending.length === 0 && measures.length === 0 && threads.length === 0,
      'Setup() while operating')
    if (options.getTime) getTime = options.getTime
    const big = typeof getTime() !== 'number'
    timeScale = options.timeScale || (big ? BigInt(1e3) : 1)
    T0 = big ? 0n : 0
    step = big ? 1n : 1
  }
  return old
}

const profOn = (yes = undefined) => {
  const old = isEnabled
  if (yes !== undefined) {
    assert(yes || !(pending.length || threads.length), 'On(false) in pending state')
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

