'use strict'

const Qektors = require('../src/Qektors')
const Strict = require('../src/Qektors-strict')

function Fake () {
}

const testCtr = (Target) => {
  it('constructor should fail with bad args', () => {
    expect(() => (new Target(0))).toThrow(TypeError)
    expect(() => new Target(null)).toThrow('should be an object')
    expect(() => new Target({ width: 0 })).toThrow('width')
    expect(() => new Target({ Ctr: 1, width: 1 })).toThrow('Ctr')
    if (Target === Strict) {
      expect(() => new Target({ Ctr: () => this, width: 1 })).toThrow('not a constructor')
      expect(() => new Target({ Ctr: Fake, width: 1 })).toThrow('be array')
      expect(() => new Target({ Ctr: String, width: 1 })).toThrow('be array')
    }
  })
}

//  Array.from() does not work with proxy.
const toArray = vector => {
  const array = []
  for (let i = 0; i < vector.length; ++i) array.push(vector[i])
  return array
}

const testEmpty = (target, strict) => {
  expect(target.strict).toBe(strict)
  expect(target.isTyped).toBe(new target.Ctr(1).buffer instanceof ArrayBuffer)
  expect(target.size).toBe(0)
  expect(target.top).toBe(undefined)
  expect(target.topIndex).toBe(0)
  expect(target.width).toBe(3)
  if (strict) {
    //  Todo: messages?
    expect(() => target.at(0)).toThrow('bad index value')
    expect(() => target.at(1)).toThrow('bad index value')
  } else {
    expect(target.at(0)).toBe(undefined)
    expect(target.at(1)).toBe(undefined)
  }
  expect(target.indexOf(0)).toBe(0)
  expect(target.indexOf(1)).toBe(0)
  expect(target.map(() => 1)).toEqual([])
  expect(target.delete()).toBe(0)
}

const tests = (target, strict = false) => {
  it('should be initialized and empty', () => {
    testEmpty(target, strict)
    expect(target.volume).toBe(0)
  })

  it('should push', () => {
    expect(target.push(11, 12, 13)).toBe(1)
    expect(target.at(1)).toBeInstanceOf(target.Ctr === Array ? Array : Int32Array)
    expect(toArray(target.at(1))).toEqual([11, 12, 13])
    if (strict) {
      expect(() => target.push(21, 22, 23, 24)).toThrow('arguments count')
      expect(() => target.push(0, 22, 23)).toThrow('positive integer')
      expect(target.push(21, 22, 23)).toBe(2)
    } else {
      expect(target.push(21, 22, 23, 24)).toBe(2)
    }
    expect(target.push(31, 32, 33)).toBe(3)
    let v = target.at(2)
    expect(toArray(v)).toEqual(!strict && target.Ctr === Array
      ? [21, 22, 23, 24] : [21, 22, 23])
    if (strict) {
      expect(() => (v[0] = 20)).toThrow('immutable')
      expect(() => (v[5] = 20)).toThrow('out of bounds')
      if (target.Ctr !== Array) {
        expect(() => (v[2] = 2.1)).toThrow('bad value')
        expect(v[2]).toBe(23)
      }
    }
    v[2] = 25
    expect(target.indexOf(11)).toBe(1)
    expect(target.size).toBe(3)
    expect(target.top[2]).toBe(33)
    expect(target.map(r => r).length).toBe(3)
  })

  it('should grant', () => {
    expect(target.grant(21)).toBe(2)
    expect(target.grant(41)).toBe(4)
    expect(target.size).toBe(4)
  })

  it('should have array-like entries', () => {
    expect(target.at(1).length).toBe(3)
    expect(target.at(1).indexOf(12)).toBe(1)
  })

  it('should delete', () => {
    expect(target.delete()).toBe(3)
    expect(target.delete()).toBe(2)
    if (!strict) expect(target.at(3)).toBe(undefined)
    expect(target.indexOf(31)).toBe(0)
    expect(target.map(r => r).length).toBe(2)
    expect(target.size).toBe(2)
    expect(target.volume).toBe(4)
  })

  it('should re-use free space', () => {
    expect(target.indexOf(0)).toBe(0)
    expect(target.grant(331)).toBe(3)
    expect(target.size).toBe(3)
    expect(target.volume).toBe(4)
    expect(target.push(441, 442)).toBe(4)
  })

  it('should clear', () => {
    expect(target.clear().volume).toBe(4)
    testEmpty(target, strict)
  })
}

const testStrict = target => {
  const rec = target.at(target.grant(42))
  let ok = 0

  it('should not mutate via methods', () => {
    expect(() => rec.push(43)).toThrow('not a function')
    expect(() => rec.pop()).toThrow('not a function')
    expect(() => rec.shift()).toThrow('not a function')
    expect(() => rec.unshift(41)).toThrow('not a function')
    expect(() => rec.splice(1, 0, 50)).toThrow('not a function')
    ok = 1
  })

  it('should not mutate key element', () => {
    if (--ok < 0) return
    expect(() => (rec[0] = 43)).toThrow('immutable')
    ok = 1
  })

  it('should not allow out-of bound index', () => {
    if (--ok < 0) return
    expect(() => (rec[-1] = 43)).toThrow('out of bounds')
    expect(() => (rec[3] = 43)).toThrow('out of bounds')
    ok = 1
  })

  it('should not allow non-integer index', () => {
    if (--ok < 0) return
    expect(() => (rec[1.5] = 43)).toThrow('non-integer index')
    ok = 1
  })

  it('should not push non-unique key', () => {
    target.grant(36)
    expect(() => target.push(36, 37, 38)).toThrow('must be unique')
  })

  it('should not allow improper value assignment', () => {
    if (target.Ctr === Array || --ok < 0) return
    expect(() => (rec[1] = 43.1)).toThrow('bad value')
    expect(() => (rec[1] = "1")).toThrow('bad value')
    expect(() => (rec[1] = {})).toThrow(': bad value')
    const l = target.topIndex
    expect(() => target.push(39, 12.3)).toThrow('bad value #1')
    expect(target.topIndex).toBe(l)
  })
}

describe('Qektors', () => {
  testCtr(Qektors)
  tests(new Qektors({ width: 3 }))
})

describe('StrictQektors', () => {
  testCtr(Strict)
  tests(new Strict({ width: 3 }), true)
  testStrict(new Strict({ width: 3 }))
})

describe('Qektors using Array', () => {
  tests(new Qektors({ Ctr: Array, width: 3 }))
})

describe('StrictQektors using Array', () => {
  tests(new Strict({ Ctr: Array, width: 3 }), true)
  testStrict(new Strict({ Ctr: Array, width: 3 }))
})
