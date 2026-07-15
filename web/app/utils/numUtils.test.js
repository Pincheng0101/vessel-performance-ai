import { describe, expect, test } from 'vitest';
import numUtils from './numUtils';

describe('numUtils.format', () => {
  test('formats an integer without fraction digits', () => {
    expect(numUtils.format(0)).toBe('0');
  });

  test('formats with the requested fraction digits regardless of locale separator', () => {
    expect(numUtils.format(1.5, 2)).toMatch(/^1[.,]50$/);
  });

  test('accepts numeric strings', () => {
    expect(numUtils.format('42')).toBe('42');
  });

  test.each([null, undefined, 'abc', NaN, Infinity, -Infinity])(
    'returns null for invalid input %j',
    (input) => {
      expect(numUtils.format(input)).toBeNull();
    },
  );
});
