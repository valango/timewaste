/* eslint no-console: 0 */
'use strict'
process.env.NODE_ENV = 'test'
const {profBegin, profEnd, profResults} = require('./index')

profBegin('a')
profBegin('b')
profBegin('c')
profEnd(true)

const res = profResults()

console.log(res)
