'use strict'
const constants = require('./constants')

let api

if (process.env.NODE_ENV === 'production' && !process.env.TIMEWASTE) {
  const nope = () => false

  api = {
    profBegin: nope,
    profEnd: nope,
    profEnable: nope,
    profPendingCount: () => 0,
    profResults: () => [],
    profSetup: () => ({}),
    profStatus: () => ({ enabled: false }),
    profTexts: () => []
  }
} else {
  const factory = require('./profiler')

  if (process && process.hrtime) {
    const ut = require('microtime').now
    //  NB: timer overflow may happen, but fot manual profiling its survivable.
    api = factory({ getTime: () => ut() & 0x7fffffff, timeScale: 1 })
  } else {
    api = factory({ getTime: Date.now, timeScale: 1000 })
  }
}

module.exports = { ...constants, ...api }
