import { describe, expect, test } from 'vitest';
import jsonUtils from './jsonUtils';

describe('jsonUtils.safeParse', () => {
  test('parses a valid JSON string into a value', () => {
    expect(jsonUtils.safeParse('{"a":1}')).toEqual({ a: 1 });
  });

  test('returns null for invalid JSON', () => {
    expect(jsonUtils.safeParse('not json')).toBeNull();
  });

  test.each([undefined, null, ''])('returns null for non-parseable input %j', (input) => {
    expect(jsonUtils.safeParse(input)).toBeNull();
  });
});

describe('jsonUtils.safeBeautify', () => {
  test('pretty-prints an object with 2-space indentation', () => {
    expect(jsonUtils.safeBeautify({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  test('pretty-prints a parseable JSON string', () => {
    expect(jsonUtils.safeBeautify('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  test('returns the original string when it is not valid JSON', () => {
    expect(jsonUtils.safeBeautify('not json')).toBe('not json');
  });
});

describe('jsonUtils.isValid', () => {
  test.each(['{"a":1}', '[1,2]', '"x"', 'true', 'null', '0'])(
    'returns true for valid JSON %j',
    (input) => {
      expect(jsonUtils.isValid(input)).toBe(true);
    },
  );

  test.each(['', 'not json', '{a:1}'])('returns false for invalid JSON %j', (input) => {
    expect(jsonUtils.isValid(input)).toBe(false);
  });
});

describe('jsonUtils.isObject', () => {
  test('returns true for object-shaped JSON strings', () => {
    expect(jsonUtils.isObject('{"a":1}')).toBe(true);
  });

  test('returns true for array-shaped JSON strings', () => {
    expect(jsonUtils.isObject('[1,2]')).toBe(true);
  });

  test.each(['"x"', 'true', '0', 'null'])(
    'returns false for non-object JSON %j',
    (input) => {
      expect(jsonUtils.isObject(input)).toBe(false);
    },
  );

  test.each(['', 'not json'])('returns false for invalid JSON %j', (input) => {
    expect(jsonUtils.isObject(input)).toBe(false);
  });
});
