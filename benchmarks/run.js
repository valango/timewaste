//  For debugging IDE.
'use strict'

const Q = require('../src/Qektors')
const S = require('../src/Qektors-strict')
const profiler = require('../src')
const run = require('../test/run')


const N_THREADS = 2
// const tags = 'abcdefghij'.split(''), nTags = tags.length
const tags = 'ab'.split(''), nTags = tags.length

let options = { profiler, tags, threads: N_THREADS - 1 }
let res = new S({ width: 3 })
res.push(11,12)
let at = res.at(1)
let v = at.length
v = at.indexOf(12)
v = at[2]
at[2] = 25
v = at[2]

res = run({
  fuck: (cycle, it) => {
    if (cycle === (nTags + 2) && it === 1) {
      return true
    }
  }, ...options
})

console.log(res)
console.log(profiler.profStatus(false))
console.log(profiler.profResults())
