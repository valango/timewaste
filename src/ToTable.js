'use strict'

const SPACES = 3      //  Leave at least 3 spaces between columns.

/**
 * Correctly round a non-negative numeric value.
 *
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 * @see (@link http://www.jacklmoore.com/notes/rounding-in-javascript)
 */
const round = (value, decimals) => {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals)
}

/**
 * @class ToTable
 * A simple formatter expecting the #0 column to contain strings
 * and all others - non-negative numerics.
 */
class ToTable {
  /**
   * @param {{[]header: string[], [precision]: number}} options
   */
  constructor (options = undefined) {
    this._columns = []
    this._header = options.header
    this._maxColumns = 0
    this._precision = options.precision || 2
    this._rows = []

    if (this._header) {
      let h = this._header, limit = h.length, dsc = this._columns
      if (this._maxColumns > 0) limit = Math.min(this._maxColumns, limit)
      for (let iC = 0; iC < limit; ++iC) dsc.push({ width: h[iC].length })
      this._maxColumns = limit
    }
  }

  _mkLine (texts) {
    const dsc = this._columns
    return texts.map((str, i) => {
      const w = dsc[i].width
      return i === 0 ? str.padEnd(w) : str.padStart(w)
    }).join('   ')
  }

  /**
   * @param {Array<*>} newRow
   */
  add (newRow) {
    const row = []
    let limit = newRow.length
    if (this._maxColumns) limit = Math.min(this._maxColumns, limit)

    for (let iC = 0; iC < limit; ++iC) {
      let dsc = this._columns[iC], v = newRow[iC]

      if (dsc === undefined) this._columns.push(dsc = { width: 0 })

      if (v === undefined) {
        v = ''
      } else if (typeof v === 'number' && !dsc.decimals
        && Math.abs((v % 1) * this._precision) > 1) {
        dsc.decimals = this._precision   //  Perhaps different values in future.
      }
      row.push(v)
    }
    this._rows.push(row)
  }

  /**
   * Output the contents as array of table rows.
   *
   * Instead of concatenating the dump() results to something,
   * use this _something_ as `target` here.
   *
   * @param {string[]=} target
   * @returns {string[]}
   */
  dump (target = undefined) {
    const nCols = this._columns.length, lines = target || [], iStart = lines.length

    //  Because fractional values found anywhere would affect column width,
    //  we could not calculate widths before.
    //  Populate this._rows[] with strings to avoid double work in future.
    for (let iR = 0, row; (row = this._rows[iR]) !== undefined; ++iR) {
      for (let iC = 0, dsc, width; (dsc = (this._columns[iC])) !== undefined; ++iC) {
        let v = row[iC], decs

        if (typeof v !== 'string') {
          if (typeof v === 'number' && (decs = dsc.decimals) !== undefined) {
            const suff = '.' + new Uint8Array(decs).join('')
            v = round(v, decs) + ''
            const l = v.length, d = v.indexOf('.')
            v += d < 0 ? suff : suff.substring(l - d)
          }
          row[iC] = (v += '')
        }
        width = v.length
        if (width === undefined) {
          width = 0
        }
        if (!(width <= dsc.width)) dsc.width = width
      }
    }

    if (this._header) {
      let i = 0, width = -SPACES

      while (i < nCols) width += this._columns[i++].width + SPACES
      lines.splice(iStart, 0, new Array(width).fill('-').join(''))
      lines.splice(iStart, 0, this._mkLine(this._header, false))
    }

    //  Do the actual outputting, at last.
    for (let i = 0; i < this._rows.length; ++i) {
      lines.push(this._mkLine(this._rows[i], true))
    }

    return lines
  }
}

module.exports = ToTable
