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
