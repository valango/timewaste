//  For debugging IDE.
'use strict'
/* eslint no-console: 0 */

const profiler = require('..')

//  Helper functions

const beg = (t, tags, threadId = undefined) => {
  return Array.from(tags).map(tag => t.profBeg(tag, threadId))
}

const end = (t, handles, threadId = undefined) => {
  return handles.map(h => t.profEnd(h, threadId))
}

let res, t = profiler
end(t,beg(t,'abc').reverse())
end(t,beg(t,'ab').reverse())
end(t,beg(t,'a').reverse())
res = t.profResults()
console.log(t.profTexts(res))
/*
const run = require('../test/run')
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
*/
