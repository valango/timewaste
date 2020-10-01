'use strict'

/**
 * Dictionary for presenting string as positive integers.
 * With big dictionaries, this implementation is
 * much faster than array of strings.
 * @constructor
 */
function IndexMap () {
  this._map = new Map()
}

/**
 * Clear all entries.
 */
IndexMap.prototype.clear = function () {
  this._map.clear()
}

/**
 * Remove an entry by key.
 * @param {string} key
 * @returns {boolean}
 */
IndexMap.prototype.delete = function (key) {
  return this._map.delete(key)
}

/**
 * Retrieve an index for key.
 * @param {string} key
 * @returns {number}
 */
IndexMap.prototype.get = function (key) {
  return this._map.get(key) || 0
}

/**
 * Retrieve an index for possibly new key.
 *
 * @param {string} key - can't be empty.
 * @returns {number} - index of array element; 0 is returned on empty string.
 */
IndexMap.prototype.put = function (key) {
  let a = this._map, i = 0

  if (key && (i = a.get(key)) === undefined) {
    a.set(key, i = (a.size + 1))
  }
  return i
}

/**
 * Get array element by index.
 * @param {number} index
 * @returns {*}
 * @throws {Error} on non-existent key.
 */
IndexMap.prototype.at = function (index) {
  const map = this._map, size = map.size, iterator = map.keys()

  if (!(index >= 1 && index <= size)) return undefined

  for (let i = 0, r; (r = iterator.next()).done === false;) {
    if (++i === index) return r.value
  }
  /* istanbul ignore next */
  throw new Error('IndexMap#at(' + index + '): failed')
}

/**
 * @returns {number} of entries.
 */
IndexMap.prototype.size = function () {
  return this._map.size
}

module.exports = IndexMap
