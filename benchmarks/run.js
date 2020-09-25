//  For debugging IDE.
'use strict'

const profiler = require('..')
const run = require('../test/run')
let res

const N_THREADS = 2
// const tags = 'abcdefghij'.split(''), nTags = tags.length
const tags = 'ab'.split(''), nTags = tags.length

let options = { profiler, tags, threads: N_THREADS - 1 }

res = run({
  failAt: (cycle, it) => {
    if (cycle === (nTags + 2) && it === 1) {
      return true
    }
  }, ...options
})

console.log(res)
console.log(profiler.profStatus(false))
console.log(profiler.profResults())
