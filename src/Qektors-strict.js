'use strict'

const Qektors = require('./Qektors')

const PROHIBITED = 'push pop splice shift unshift'.split(' ')

/**
 * Qektors with strict argument checks, useful while debugging.
 */
class StrictQuektors extends Qektors {
  constructor (options) {
    super(options)

    let msg

    try {
      const t = new this._Ctr(1)
      t[0] = 42
      if (!(t.length === 1 && t[0] === 42)) {
        msg = 'does not look right'
      }
    } catch (e) {
      msg = e.message
    }

    if (msg) {
      this._complain('\'Ctr\' option must be array constructor', '', msg)
    }
  }

  /**
   * Assertion helper composing meaningful error messages.
   * @param {*} condition - falsy value wil throw;
   * @param {string} locus - usually function name;
   * @param {string} msg
   * @param {...*} values - usually function arguments.
   * @private
   */
  _assert (condition, locus, msg, ...values) {
    if (condition) return
    const args = (Array.isArray(values[0]) ? values[0] : values).join(', ')
    this._complain(typeof msg === 'function' ? msg() : msg, locus + '(' + args + ')')
  }

  get strict () {
    return true
  }

  at (index) {
    const assert = this._assert.bind(this), entry = super.at(index)
    const noFun = what => (assert(false, what, 'not a function'))

    assert(entry !== undefined, 'at', 'bad index value', index)

    const locus = '[' + index + ']'
    //  Check the bounds and return a valid integer.
    const bounds = idx => {
      const j = 1 * idx
      assert(j >= 0 && j < this.width, locus, 'out of bounds', idx)
      assert(Math.floor(j) === j, locus, 'non-integer index', idx)
      return j
    }

    //  This proxy ensures that all illegal operations with returned entry
    //  get thrown exceptions upon.
    return new Proxy(entry, {
      /**
       * @param {Object} o
       * @param {string} i  - yes, string - this is how the Proxy works.
       * @returns {*}
       */
      get: (o, i) => {
        let j = 1 * i, r
        if (Number.isNaN(j)) {
          assert((r = o[i]) !== undefined, locus, 'not a function or property', `'${i}'`)
          if (PROHIBITED.includes(i)) return noFun(i)
          if (typeof r === 'function') r = r.bind(o)
        } else {                //  Numeric index
          bounds(j)
          assert((r = o[j]) !== undefined, locus, 'x-out of bounds', i, j, typeof o[i])
        }
        return r
      },
      set: (o, i, v) => {
        const j = bounds(i), old = o[j]
        assert(j >= 1, locus + '.assign', 'the 1-st element is immutable', v)
        o[j] = v
        if (o[j] === v) return true
        o[j] = old
        assert(false, locus + '.assign', 'bad value', v)
      }
    })
  }

  grant (key) {
    this._assert(key >= 1, 'grant', 'argument must be >= 1')
    return super.grant(key)
  }

  push (...values) {
    const { length } = values

    this._assert(values[0] > 0, 'push', 'the 1st value must be a positive integer', values)
    this._assert(length > 0 && length <= this.width, 'push', 'bad arguments count', values)
    this._assert(this.indexOf(values[0]) < 1, 'push', 'key value must be unique', values)
    const index = super.push.apply(this, values)

    for (let i = 0, top = this.top; i < length; ++i) {
      this._assert(top[i] === values[i], 'push', () => {
        this.delete()
        return 'bad value #' + i + ': ' + values[i]
      })
    }
    return index
  }
}

module.exports = StrictQuektors
