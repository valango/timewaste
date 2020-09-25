//   Compares new profiler with its outdated prototype and
//  can benchmark the Qektors itself.
'use strict'
/* eslint no-console: 0 */

const assert = require('assert')
const { N, T } = require('../src/Qektors')
const a = require('../src')
const b = require('./profiler-old')

const print = string => process.stdout.write(string)

let beVerbose = false
const parameters = []

for (let i = 2, arg; (arg = process.argv[i]) !== undefined; ++i) {
  const c = arg[0]
  if (c === 'v') {
    beVerbose = true
  } else if (c >= '0' && c <= '9') parameters.push(1 * arg)
}

const { getTime } = a.profSetup()

const cycles = parameters[0]

if (!cycles) {
  print('Usage: profilers ["v"] loop-count\n')
  process.exit(1)
}

const DEBUG = process.env.NODE_ENV === 'debug'
const LEAK = DEBUG ? 2 : 10
const tags = Array.from(DEBUG ? 'ab' : 'abcdefghijklmnopqrstuvwxyz')
const hndl = new Array(tags.length)

const run = () => {
  let res, t0 = getTime(), stat
  for (let cycle = 0; cycle < cycles; ++cycle) {
    stat = 0
    tags.forEach((t, i) => (hndl[i] = a.profBeg(t)))
    hndl.reverse().forEach((h, i) => (i % LEAK) && a.profEnd(h))
  }
  const ta = getTime() - t0

  stat = a.profStatus(true)
  res = a.profResults()
  if (beVerbose) {
    console.log('STAT', stat)
    res = a.profTexts(-1, res)
    res.forEach(line => print(line + '\n'))
    print('\n')
  }
  print('profiler.new: ' + ta + '\n')
  if (res.errors) print(res.errors.length + ' errors detected:\n')
  b.profSetup({ assert, getTime })
  t0 = getTime()
  for (let cycle = 0; cycle < cycles; ++cycle) {
    tags.forEach(t => b.profBegin(t))
    tags.reverse().forEach((t, i) => (i % 10) && b.profEnd(t))
  }
  // res = b.profResults()
  const tb = getTime() - t0
  res = a.profResults()
  print('profiler.old: ' + tb + '\n')
  if (res.errors) print(res.errors.length + ' errors detected:\n')
  for (const key of Object.keys(N)) {
    const n = N[key], t = T[key]
    if (!n) continue
    console.log(key.padEnd(20, ' ') + (n + '').padStart(7, ' ') + '\t' + t + '\t' + t / n)
  }
}

run()
