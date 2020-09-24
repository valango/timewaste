'use strict'

let idSeed = 0

/**
 * @class ThreadEmulator
 */
class ThreadEmulator {
  constructor (tags, profiler, getTime, id = undefined) {
    this.getTime = getTime
    this.profiler = profiler
    this.handles = []
    this.tags = tags
    this.id = id === undefined ? ++idSeed : id
    this.stepIndex = 0
  }

  reset () {
    this.handles = []
    this.stepIndex = 0

    return this
  }

  /**
   *  Perform the next operation, then 'yield' to the next thread.
   *
   * @param {*=} failure
   *  - numeric value forces step with given number, but not advancing steps;
   *  - true prevents the step from actually happening.
   * @returns {[*, *]} Duration and return value.
   */
  step (failure = undefined) {
    const { getTime, handles, id, profiler, stepIndex, tags } = this
    const number = typeof failure === 'number' ? failure : stepIndex
    const thrId = id || undefined
    let duration, result, tag

    if (number < tags.length) {
      if (failure !== true) {
        tag = tags[stepIndex]
        duration = getTime()
        result = profiler.profBeg(tag, thrId)
        if (result < 0) {
          result *= 1
        }
        duration = getTime() - duration
        handles.push(result)
      }
    } else {
      const handle = handles.pop()
      if (!failure) {
        duration = getTime()
        result = profiler.profEnd(handle, thrId)
        duration = getTime() - duration
      }
    }
    if (typeof failure !== 'number') {
      this.stepIndex = number < (2 * tags.length - 1) ? number + 1 : 0
    }

    return [duration, result]
  }
}

module.exports = ThreadEmulator
