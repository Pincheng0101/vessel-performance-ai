import { describe, expect, test } from 'vitest';
import getType from './getType';

describe('getType', () => {
  test.each([
    ['hello', 'string'],
    [42, 'number'],
    [true, 'boolean'],
    [null, 'null'],
    [undefined, 'undefined'],
    [[], 'array'],
    [{}, 'object'],
  ])('returns %j as %j', (input, expected) => {
    expect(getType(input)).toBe(expected);
  });

  test('returns "function" for functions', () => {
    expect(getType(() => {})).toBe('function');
  });

  test('returns "symbol" for Symbol values', () => {
    expect(getType(Symbol('x'))).toBe('symbol');
  });

  test('returns "date" for Date instances', () => {
    expect(getType(new Date())).toBe('date');
  });

  test('returns "regexp" for RegExp instances', () => {
    expect(getType(/abc/)).toBe('regexp');
  });

  test('returns "object" for plain class instances', () => {
    class Plain {}
    expect(getType(new Plain())).toBe('object');
  });

  test('returns the lowercased Symbol.toStringTag when defined on a class', () => {
    class Tagged {
      get [Symbol.toStringTag]() { return 'Tagged'; }
    }
    expect(getType(new Tagged())).toBe('tagged');
  });
});
