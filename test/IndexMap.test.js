'use strict'
const IndexMap = require('../src/IndexMap')

const test = (target) => {
  it('should be empty', () => {
    expect(target.at(-1)).toBe(undefined)
    expect(target.at(0)).toBe(undefined)
    expect(target.at(1)).toBe(undefined)
    expect(target.size()).toBe(0)
  })

  it('should set values', () => {
    expect(target.put('')).toBe(0)
    expect(target.put('a')).toBe(1)
    expect(target.put('b')).toBe(2)
    expect(target.put('a')).toBe(1)
    expect(target.size()).toBe(2)
  })

  it('should get values', () => {
    expect(target.at(-1)).toBe(undefined)
    expect(target.at(0)).toBe(undefined)
    expect(target.at(1)).toBe('a')
    expect(target.at(2)).toBe('b')
    expect(target.at(3)).toBe(undefined)
  })
}

describe('IndexMap', () => test(new IndexMap()))
