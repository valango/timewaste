'use strict'

const defaults = require('lodash.defaults')
// $ const { hrtime } = process
// $ const getTime = hrtime.bigint

//  The T and N objects below are for profiling the class code, and
//  will be removed in future releases.
//  To enable profiling, replace '\/\/ \$' with '\/\* \$ \*\/'.
const N = {
  at: 0n,
  clear: 0n,
  delete: 0n,
  grant: 0n,
  indexOf: 0n,
  map: 0n,
  push: 0n
}

const T = {
  at: 0n,
  clear: 0n,
  delete: 0n,
  grant: 0n,
  indexOf: 0n,
  map: 0n,
  push: 0n
}

const ME = 'Qektors'
const E_OPTIONS = '\'options\' should be an object with positive \'width\' property'

/**
 * @class Qektors
 * LIFO of numeric keyed vectors.
 * This class helps to minimize Garbage Collector runs.
 *
 * @property {function()} Ctr       - entry constructor.
 * @property {boolean}    isLocked  - used by profiler.
 * @property {boolean}    isTyped   - true if entries use `TypedArray` interface.
 * @property {Qektors}    next      - used by profiler for building lists.
 * @property {number}     size      - number of entries (equals `topIndex`).
 * @property {boolean}    strict    - true if this is a `StrictQuektors` instance.
 * @property {ArrayLike}  top       - the last entry or undefined if container is empty.
 * @property {number}     topIndex  - index of the top entry (equals `size`).
 * @property {number}     total     - used by profiler.
 * @property {number}     volume    - total size of entries pool (for diagnostics).
 * @property {number}     width     - entry length.
 */
class Qektors {
  /**
   * @param {Object} options
   */
  constructor (options) {
    if (!(options && typeof options === 'object')) this._complain(E_OPTIONS, '', 0)
    const opts = defaults({}, options, Qektors.options)
    if (!(opts.width >= 1)) this._complain(E_OPTIONS)
    if (typeof opts.Ctr !== 'function') this._complain('bad \'Ctr\' option')

    this._Ctr = opts.Ctr
    this._iTop = 0
    this._width = opts.width

    this.total = 0
    this.isLocked = false
    this.next = null
    this._raw = [new this._Ctr(this._width)]  //  This way, valid index is never 0!
    this._isTyped = (this._raw.buffer && this._raw.buffer instanceof ArrayBuffer) || false
  }

  /**
   * Internal error emitter.
   * @param {string} msg    - error message.
   * @param {string=} locus - empty means constructor.
   * @param {string|number} extras - for `extras` property or 0 for generating TypeError.
   * @protected
   */
  _complain (msg, locus, extras = undefined) {
    const error = new (extras === 0 ? TypeError : Error)(
      ME + (locus ? '.' + locus : '()') + ': ' + msg)
    if (extras) error.extras = extras

    throw error
  }

  /** @type {string} - only temporarily here! *
   get debugInfo () {
    const s = ['locked=' + this.isLocked, 'top=' + this._iTop + ' _raw=']
    for (let i = 1; i < this._raw.length; ++i) {
      s.push('\n    [' + this._raw[i].join(' ') + ']')
    }
    return s.join(', ')
  } */

  get Ctr () {
    return this._Ctr
  }

  get isTyped () {
    return this._isTyped
  }

  get size () {
    return this._iTop
  }

  get strict () {
    return false
  }

  get top () {
    const { _iTop } = this
    return _iTop === 0 ? undefined : this._raw[_iTop]
  }

  get topIndex () {
    return this._iTop
  }

  get volume () {
    return this._raw.length - 1
  }

  get width () {
    return this._width
  }

  // $ /*
  at (index) {
    if (index === 0) return undefined
    const entry = this._raw[index]
    return entry && entry[0] === 0 ? undefined : entry
  } // $ /* */

  // $ at (index) {
  // $   const t0 = getTime()
  // $   let entry
  // $   if (index !== 0) {
  // $     entry = this._raw[index]
  // $     entry = entry && entry[0] === 0 ? undefined : entry
  // $   }
  // $   ++N.at, T.at += getTime() - t0
  // $   return entry
  // $ }

  clear () {
    // $ const t0 = getTime()
    const { _raw } = this

    for (let i = this._iTop; i > 0; --i) _raw[i][0] = 0
    this._iTop = 0
    // $ ++N.clear, T.clear += getTime() - t0
    return this
  }

  /**
   * Mark the top entry as deleted.
   * @returns {number} remaining size or undefined on failure
   */
  delete () {
    // $ const t0 = getTime()
    let { _iTop } = this

    if (_iTop > 0) {
      this._raw[_iTop][0] = 0
      this._iTop = --_iTop
    }
    // $ ++N.delete, T.delete += getTime() - t0
    return _iTop
  }

  /**
   * Ensure that that entry with given `key` exists.
   * @param {number} key
   * @returns {number} index of the key.
   */
  grant (key) {
    // $ const t0 = getTime()
    let index = this.indexOf(key), entry

    if (index === 0) {
      const { _iTop, _raw } = this
      if ((index = _iTop + 1) === _raw.length) {
        _raw.push(entry = new this._Ctr(this._width))
      } else {
        entry = _raw[index]
      }
      entry[0] = key
      this._iTop = index
    }
    // $ ++N.grant, T.grant += getTime() - t0
    return index
  }

  /**
   * Get index of entry with given `key`.
   * @param {number} key
   * @returns {number}  0 if not found.
   */
  indexOf (key) {
    // $ const t0 = getTime()
    let { _iTop, _raw } = this

    while (_iTop !== 0 && _raw[_iTop][0] !== key) --_iTop
    // $ ++N.indexOf, T.indexOf += getTime() - t0
    return _iTop
  }

  /**
   * Similar to Array.prototype.map(), except the `limit` parameter.
   * @param {function(*,*,*):*} cb
   * @returns {[]}
   */
  map (cb) {
    // $ const t0 = getTime()
    const res = [], { _raw, _iTop } = this

    for (let i = 1; i <= _iTop; ++i) {
      res.push(cb(_raw[i], i, this))
    }
    // $ ++N.map, T.map += getTime() - t0
    return res
  }

  /**
   * @param {...number} values
   * @returns {number} new topIndex
   */
  push (...values) {
    // $ const t0 = getTime()
    let { _iTop, _raw } = this, entry

    if (++_iTop === _raw.length) {
      _raw.push(entry = new this._Ctr(this._width))
    } else {
      entry = _raw[_iTop]
    }
    for (let i = values.length; --i >= 0;) entry[i] = values[i]
    this._iTop = _iTop
    // $ ++N.push, T.push += getTime() - t0
    return _iTop
  }
}

Qektors.options = {
  Ctr: Int32Array || Array
}

//  The T and N objects below are for profiling the class code, and
//  will be removed in future releases.
Qektors.N = N
Qektors.T = T

module.exports = Qektors
