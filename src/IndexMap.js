'use strict'

/**
 * Dictionary for presenting string as positive integers.
 * With big dictionaries, this implementation is
 * much faster than array of strings.
 * @constructor
 */
function IndexMap () {
  this._map = new Map()
  this._seed = 0
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
 * Get string by index.
 * @param {number} index
 * @returns {string|undefined}
 */
IndexMap.prototype.at = function (index) {
  if (index >= 1 && index <= this._map.size) {
    const iterator = this._map.keys()

    for (let i = 0, r; (r = iterator.next()).done === false;) {
      if (++i === index) return r.value
    }
  }
  return undefined
}

/**
 * @returns {number} of entries.
 */
IndexMap.prototype.size = function () {
  return this._map.size
}

module.exports = IndexMap
