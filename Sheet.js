/**
 * @version 1.1.0
 * @module lib/Sheet
 */
'use strict'

/** @typedef TSheetOptions {Object}
 * @property {number} block     - Number of rows between headers (40).
 * @property {number} maxCWidth - Maximum column width (40).
 * @property {string} bSep      - Block separator - a line to be prepended to `header` ('\n').
 * @property {string} cSep      - Column separator ('  ').
 * @property {string} hSep      - Line under the `header` ('-+') - must match cSep, if not empty!
 */

const DEFAULTS = {
  block: 40,
  maxCWidth: 40,
  minWidth: 3,
  bSep: '\n',
  cSep: '  ',
  hSep: '-+'
}

/** @implements {Iterator} */
class Sheet {
  /**
   * Simple formatter for spreadsheet-like output
   * @param {Object=} options
   *  {number} block     - Number of rows between headers (40).
   *  {number} maxCWidth - Maximum column width (40).
   *  {string} bSep      - Block separator - a line to be prepended to `header` ('\n').
   *  {string} cSep      - Column separator ('  ').
   *  {string} hSep      - Line under the `header` ('-+') - must match cSep, if not empty!
   */
  constructor (options = {}) {
    this._colCount = 0
    this._header = null
    this._opt = { ...DEFAULTS, ...options }       // _defaults({}, options || {}, DEFAULTS)
    this._rows = []
    this._width = 0
    /**
     * @type {number[]}
     * @private
     */
    this._widths = []

    this[Symbol.iterator] = () => {
      let index = 0
      return {
        next: () => {
          if (index >= this._rows.length) return { done: true }
          let h = index % this._opt.block === 0 && this.header
          let value = this.getLine(index++)
          if (h) {
            h = this._opt.bSep + this.makeLine(h) + '\n'
            if (this._opt.hSep) {
              h = h + this.makeLine(new Array(this._colCount).fill(''),
                this._opt.hSep[0], this._opt.hSep) + '\n'
            }
            value = h + value
          }
          return { done: false, value }
        }
      }
    }
  }

  /**
   * @readonly
   * @type {number[]}
   */
  get columnWidths () {
    if (this._width < 0) {
      const cc = this._colCount, w = this._widths = new Array(cc).fill(0)
      if (!cc) return []
      const min = this._opt.minWidth
      for (const r of this._rows.concat([this.header || []])) {
        typeof r !== 'string' && r.forEach((v, i) => (w[i] = Math.max(v.length, w[i])))
      }
      w.forEach((v, i) => (v < min && (w[i] = min)))
      this._width = w.reduce((a, v) => a + v) + (cc - 1) * this._opt.cSep.length
    }
    return this._widths.slice()
  }

  /**
   * NB: the `bSep` and `hSep` options have effect with non-null header only!
   * @type {string[] | null}
   */
  get header () {
    return this._header
  }

  set header (value) {
    this._header = value
    this._width = -1            //  Force columnWidths calculation.
  }

  /**
   * @readonly
   * @type {number}
   */
  get length () {
    return this._rows.length
  }

  /**
   * Add a new row, truncating it if necessary.
   *
   * @param {*[]|string} values
   * @returns {Sheet}
   */
  append (values) {
    const mw = this._opt.maxCWidth, a = Math.floor(mw / 2) - 1
    const row = typeof values === 'string' ? values : values.map((v, col) => {
      let l, s = v === undefined ? '' : (v + '').trim()
      if ((l = s.length) > mw) {
        s = (s.substr(0, a) + '...' + s.substr(l - a)).substr(0, mw)
      }
      return s
    })
    if (typeof values !== 'string') {
      this._colCount = Math.max(row.length, this._colCount)
      this._width = -1            //  Force columnWidths calculation.
    }
    this._rows.push(row)
    return this
  }

  /**
   * Get line as formatted text.
   * @param {number} i  - line number (0-based).
   * @returns {string}
   */
  getLine (i) {
    return this.makeLine(this._rows[i])
  }

  dump () {
    const lines = []

    for (const l of this) {
      lines.push(l)
    }
    return lines
  }

  /**
   * Make a formatted line from values array.
   * @param {string[]} values
   * @param {string=}  filler - a padding symbol.
   * @param {string=}  sep    - column separator.
   * @returns {string}
   */
  makeLine (values, filler = ' ', sep = this._opt.cSep) {
    const w = this.columnWidths
    return typeof values === 'string' ? values
      : values.map((c, j) => j ? c.padStart(w[j], filler) : c.padEnd(w[j], filler)).join(sep)
  }
}

module.exports = Sheet
