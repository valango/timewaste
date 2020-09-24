'use strict'
const Thread = require('./Thread')
const noop = () => undefined

/**
 * Create threads pool and emulate running them in 'parallel'.
 *
 * @param {Object} options
 *  - {number} cycles
 * @returns {{duration: number, responses: Map}}
 */
module.exports = (options) => {
  const { profiler, tags } = options
  const getTime = options.getTime || process.hrtime.bigint
  const threadsCount = (options.threads || 0) + 1
  const cycles = (options.cycles || 1) * 2 * tags.length
  const failAt = options.failAt || noop
  const threads = [new Thread(tags, profiler, getTime, 0)]
  const responses = new Map()
  let duration, ops

  duration = getTime()
  ops = (duration -= duration)    //  Zero it, whatever number-like type.

  for (let i = threadsCount; --i > 0;) threads.push(new Thread(tags, profiler, getTime))

  for (let cycle = 0; ++cycle <= cycles;) {
    for (let it = 0; it < threads.length; ++it) {
      const thread = threads[it], fk = failAt(cycle, it)
      if (cycle === 2) {
        cycle *= 1
      }
      const [t, res] = thread.step(fk)
      if (t !== undefined) ++ops && (duration += t)
      if (res !== undefined) responses.set([it, cycle], res)
    }
  }

  return { duration, ops, responses }
}
