'use strict'

if (process.env.NODE_ENV === 'production' && !process.env.USE_DEV) {
  const noop = () => true

  module.exports = {
    profBegin: noop,
    profEnd: noop,
    profReset: noop,
    profResults: noop && [],
    profSetup: noop && {}
  }
} else {
  const api = require('./profile')

  api.profSetup({
    assert: require('assert-fine'),
    getTime: process.hrtime ? process.hrtime.bigint : Date.now
  })
  module.exports = api
}
