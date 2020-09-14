/* eslint no-console: 0 */
'use strict'
process.env.NODE_ENV = 'test'
const {profBegin, profEnd, profResults} = require('./index')

profBegin('a')
profBegin('b')
profBegin('c', 1)
profBegin('d', 2)
profEnd('a')
profEnd('c',1)

const res = profResults('mean')

console.log(res)
