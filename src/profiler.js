'use strict'
const { P_AVG, P_HEADERS } = require('./constants')

//  Sub-index offsets.
const MSR_COUNT = 1
const MSR_PURETIME = 2
const MSR_TOTALTIME = 3
// const MSR_THREADS = 4
const PND_T0 = 1
const PND_TAG = 2

const THREAD_WIDTH = 3

/**
 * Factory function injects all relevant dependencies and initializes the profiler.
 *
 * @param {Object} options for profSetup(), plus optional dependencies:
 *  Qektors, Strings, ToTable
 * @returns {Object} API
 */
const factory = (options) => {
  //  Dependencies
  const Qektors = options.Qektors || require('./Qektors')
  const Strings = options.Strings || require('./IndexMap')
  const ToTable = options.ToTable || require('./ToTable')

  //  Collections.
  /** @type {Map} dictionary of active secondary threads. */
  let threadMap
  /** @type {Map} internal errors keyed by message. */
  let errorC
  /** @type {Qektors} main thread entries. */
  let mainThreadC
  /** @type {IndexMap} dictionary of all strings (mostly tags). */
  let stringC
  /** @type {Qektors} leaks discovered. */
  let leakedC
  /** @type {Qektors} accumulating measures. */
  let measureC

  let errorHook
  /** @type {function():number} time query function. */
  let getTime
  /** @type {number} microseconds per discreet. */
  let timeScale

  // let strictMode = process.env.NODE_ENV !== 'production'

  /** @type {boolean} can be set via profOn() to control access to rest of the API. */
  let isEnabled = true

  const initialize = () => {
    errorC = new Map()
    stringC = new Strings()
    leakedC = new Qektors({ width: 2 })    //  iTag, count
    measureC = new Qektors({ width: 4 })   //  iTag, count, time, total
    mainThreadC = new Qektors({ width: 3 })   //  iMes, t0, iTag
    threadMap = new Map()
  }

  /** @returns {Array<Error>} */
  const getErrors = () => {
    const res = []
    errorC.forEach(v => res.push(v))
    return res
  }

  const markAsLeaked = (thread, downTo) => {
    let top = thread.topIndex

    if (top < downTo) return
    while (top >= downTo) {
      const path = []

      for (let i = 1; i <= top; ++i) {
        path.push(stringC.at(thread.at(i)[PND_TAG]))
      }
      const iPath = stringC.put(path.join(' '))
      const iLeak = leakedC.grant(iPath)
      leakedC.at(iLeak)[1] += 1
      thread.delete()
      --top
    }
    thread.total = 0
  }

  const newError = (message, tag, thr = undefined) => {
    const msg = message + ': \'' + tag + '\''

    if (errorHook !== undefined) errorHook(message, tag)

    if (!errorC.has(msg)) {
      const error = new Error(msg)
      error.tag = tag
      if (thr) error.threadId = thr
      errorC.set(msg, error)
    }
    return false
  }

  /**
   * @param {string} tag
   * @returns {number}
   */
  const tagIndex = tag => {
    if (!tag || /\s/.test(tag)) {
      throw new Error('Illegal tag \'' + tag + '\'')
    }
    return stringC.put(tag)
  }

  /**
   *
   * @param {string} tag
   * @param {number=} threadId
   * @returns {number} handle
   */
  const profBeg = (tag, threadId = undefined) => {
   if (!isEnabled) return undefined

    const isMain = threadId === undefined
    const time = getTime()
    const iTag = tagIndex(tag)
    const iMes = measureC.grant(iTag)
    let thread

    if (isMain) {
      thread = mainThreadC
    } else if (!(thread = threadMap.get(threadId))) {
      if ((thread = mainThreadC.next)) {
        mainThreadC.next = thread.next      //  Remove a thread from idle list.
        thread.next = null
      } else {
        thread = new Qektors({ width: THREAD_WIDTH })
      }
      threadMap.set(threadId, thread)
    }

    let iPen = -1
    if (!thread.isLocked) {
      //  If pending entry for this tag exists, then flush this stuff.
      //    if whole stack a>b>c will leak unnoticed
      //    then profBeg('b') would flush b>c, but create erroneous a>b !
      //  normal op could resume only after profEnd('a') w.o. profBeg('a')
      iPen = thread.indexOf(iMes)
      if (iPen > 0) {
        //  Mark all [iPen ... top] as leaked and discard, lock the thread.
        markAsLeaked(thread, iPen)
        //  If thread not empty, then only profEnd not above top will unlock.
        thread.isLocked = thread.topIndex > 0
        iPen = -1
      } else {
        if (thread.topIndex < 0) {
          throw new Error('baa')
        }
        iPen = thread.push(iMes, time, iTag)
        thread.total = 0                   //  This is a new entry.
      }
    }
    return iPen
  }

  const profEnd = (handle, threadId = undefined) => {
    if (!isEnabled) return undefined

    const time = getTime(), isMain = threadId === undefined
    const thread = isMain ? mainThreadC : threadMap.get(threadId)

    if (thread === undefined) return newError('profEnd: no thread', threadId)

    const entry = thread.at(handle)
    if (entry === undefined) return newError('profEnd: no entry', handle, threadId)

    //  Mark everything possible above the handle as leaked.
    markAsLeaked(thread, handle + 1)

    const measure = measureC.at(entry[0])
    const elapsed = time - entry[PND_T0]
    measure[MSR_COUNT] += 1
    measure[MSR_PURETIME] += elapsed - thread.total
    measure[MSR_TOTALTIME] += (thread.total = elapsed)

    if (thread.delete() === 0 && !isMain) {   //  A 2-ry thread depleted.
      // measure[MSR_THREADS] += 1
      threadMap.delete(thread)
      thread.next = mainThreadC.next
      mainThreadC.next = thread
      threadMap.delete(threadId)
    }
    return true
  }

  const profEnable = (yes = undefined) => {   // Todo: refactor!
    const was = isEnabled

    if (yes !== undefined) {
      if (!yes && mainThreadC.size > 0) {
        newError('profEnable(false): there are calls pending', '')
      } else {
        isEnabled = !!yes
      }
    }
    return was
  }

  const profPendingCount = () => mainThreadC.size

  const argDefaults = (...args) => {
    //  sortField, data, mask
    const values = [undefined, undefined, undefined]

    for (let i = args.length, v, j; --i >= 0;) {
      if ((v = args[i]) === undefined) continue
      j = -1
      if (typeof v === 'number') {
        j = 0
      } else if (v && typeof v === 'object') {
        if (Array.isArray(v)) {
          if (typeof v[0] === 'number') {
            j = 2
          } else {
            j = 1
          }
        } else if (v.measures) j = 1
      }
      if (j < 0 || values[j] !== undefined) return ['bad arguments']
      values[j] = v
    }
    if (values[0] === undefined) values[0] = P_AVG
    return values
  }

  const sortBy = (array, fieldIndex) => {
    if (fieldIndex === 0) {
      array.sort(([a], [b]) => {
        if (a === b) return 0
        return a < b ? -1 : 1
      })
    } else {
      array.sort((a, b) => (b[fieldIndex] - a[fieldIndex]))
    }
  }

  /**
   *
   * @param {number=} sortByField
   * @param {Object=} earlierResults
   * @returns {{[errors]: [], [leaks]: [], measures: []}}
   */
  const profResults = (sortByField = undefined, earlierResults = undefined) => {
    let [sortField, earlier] = argDefaults(sortByField, earlierResults)

    if (typeof sortField === 'string') throw new Error('profResults: ' + sortField)

    let measures = [], errors = getErrors()
    let leaks = leakedC.map(([iStr, cnt]) => ([stringC.at(iStr), cnt]))

    for (let i = measureC.topIndex; i > 0; --i) {
      const measure = measureC.at(i)
      const count = measure[MSR_COUNT]
      const tag = stringC.at(measure[0])
      const time = measure[MSR_PURETIME] * timeScale
      const total = measure[MSR_TOTALTIME] * timeScale
      measures.push([tag, count, count ? time / count : 0, time,
        count ? total / count : 0, total]) // , measure[MSR_THREADS]])
    }
    measures = measures.concat((earlier && earlier.measures) || [])
    if (sortField >= 0) sortBy(measures, sortField)

    if (earlier) {
      errors = errors.concat(earlier.errors || [])
      leaks = leaks.concat(earlier.leaks || [])
    }
    const results = { measures }

    if (errors.length) results.errors = errors
    if (leaks.length) results.leaks = leaks

    errorC.clear()
    leakedC.clear()
    measureC.clear()

    return results
  }

  /**
   * Query and possibly change general options.
   * @param {Object} options
   * @returns {Object}
   */
  const profSetup = (options = undefined) => {
    const old = { getTime, timeScale }
    let v

    if (options) {
      if ((v = options.getTime)) getTime = v
      if ((v = options.timeScale)) timeScale = v
      initialize()
    }
    return old
  }

  const profStatus = (showDetails = false) => {
    const status = {
      callDepth: mainThreadC.size,
      enabled: isEnabled,
      errorCount: errorC.size,
      leakCount: leakedC.size,
      measureCount: measureC.size,
      threadCount: threadMap.size
    }
    if (showDetails) {
      status.errors = getErrors()
      status.leaks = leakedC.map(([iStr, cnt]) => [stringC.at(iStr), cnt])
      status.openCalls = mainThreadC.map(([i]) => stringC.at(i))
      status.threadLengths = (() => {
        const res = []
        threadMap.forEach((thread, id) => res.push([id, thread.size]))
        return res
      })()
    }
    return status
  }

  const profTexts = (sortByField = undefined, useResults = undefined, fieldMask = undefined) => {
    let errors, leaks, output = [], table
    /** @type {[number, Object, number[]]} */
    let [sortField, results, toMask] = argDefaults(sortByField, useResults, fieldMask)

    if (typeof sortField === 'string') throw new Error('profTexts: ' + sortField)
    if (toMask && toMask.length === 0) toMask = undefined
    const mask = [0]

    for (let i = P_HEADERS.length; --i >= 1;) {
      if (toMask) {
        if (toMask.indexOf(i) < 0) {
          if (toMask.find(v => v > 0) !== undefined) continue
          if (toMask.indexOf(-i) >= 0) continue
        }
      }
      mask.push(i)
    }
    const measures = results
      ? (Array.isArray(results) ? results : results.measures)
      : (results = profResults(-1)).measures

    if (sortField > 0) sortBy(measures, sortField)

    if (measures !== results) {
      if ((errors = results.errors)) {
        output.push('', `*** ERRORS (${errors.length}):`)
        errors.forEach(e => output.push(e.message))
      }
      if ((leaks = results.leaks)) {
        output.push('', `*** LEAKS (${leaks.length}):`)
        table = new ToTable({ header: ['tag', 'count'] })
        sortBy(leaks, 0)
        leaks.forEach(rec => table.add(rec))
        table.dump(output)
      }
    }

    //  Let the measures be the last, as error/leak reports may be lengthy.
    output.push('', 'RESULTS:')
    table = new ToTable({ header: P_HEADERS.filter((v, i) => mask.indexOf(i) >= 0) })
    measures.forEach((rec) => {
      table.add(rec.filter((v, i) => mask.indexOf(i) >= 0))
    })
    return table.dump(output)
  }

  profSetup(options)

  return {
    profBeg,
    profEnd,
    profEnable,
    profPendingCount,
    profResults,
    profSetup,
    profStatus,
    profTexts
  }
}

module.exports = factory
