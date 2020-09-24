#!/usr/bin/env node
//  Benchmarks main module.
'use strict'

// const assert = require('assert')
// const { N, T } = require('../src/NestedNumbers')
const profiler = require('../src')
const benchmark = require('../test/run')

const print = string => process.stdout.write(string)

let beVerbose = false, c
const parameters = []

for (let i = 2, arg; (arg = process.argv[i]) !== undefined; ++i) {
  if (arg === '--help' || arg === '-h') {
    print('Usage:\n  benchmarks ["v(erbose)"] [cycles-count]\n')
    process.exit(0)
  }
  if ((c = arg[0]) === 'v') {
    beVerbose = true
  } else if (c >= '0' && c <= '9') parameters.push(1 * arg)
}

const cycles = parameters[0] || 1

const DEBUG = process.env.NODE_ENV === 'debug'
const tags = Array.from(DEBUG ? 'ab' : 'abcdefghijklmnopqrstuvwxyz')

const { duration, ops } = benchmark({
  cycles,
  profiler,
  tags
})

print('DURATION: ' + duration / 1000n + 'us (' + duration / ops + 'ns/op)\n')
