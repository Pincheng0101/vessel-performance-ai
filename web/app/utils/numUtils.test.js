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

describe('numUtils.formatCompact', () => {
  test('returns standard formatting when below 1000', () => {
    expect(numUtils.formatCompact(999)).toBe('999');
  });

  test('returns standard formatting when not a multiple of 1000', () => {
    expect(numUtils.formatCompact(1500)).toMatch(/^1[.,]?500$/);
  });

  test.each([
    [1000, '1K'],
    [2000, '2K'],
    [1_000_000, '1M'],
    [3_000_000_000, '3B'],
    [4_000_000_000_000, '4T'],
  ])('formats %j as %j with the matching tier suffix', (input, expected) => {
    expect(numUtils.formatCompact(input)).toBe(expected);
  });

  test('handles negative compact values', () => {
    expect(numUtils.formatCompact(-2000)).toBe('-2K');
  });

  test.each([null, undefined, 'abc', NaN])(
    'returns null for invalid input %j',
    (input) => {
      expect(numUtils.formatCompact(input)).toBeNull();
    },
  );

  describe('numUtils.toFiniteNumber', () => {
    test.each([
      [0, 0],
      ['42', 42],
      [1.5, 1.5],
      [null, 0],
      [undefined, 0],
      ['abc', 0],
      [NaN, 0],
      [Infinity, 0],
      [-Infinity, 0],
    ])('converts %j to %j', (input, expected) => {
      expect(numUtils.toFiniteNumber(input)).toBe(expected);
    });

    test('returns the fallback for invalid values', () => {
      expect(numUtils.toFiniteNumber('abc', 7)).toBe(7);
    });
  });
});

describe('numUtils.formatPercentageLabel', () => {
  test.each([
    [0, '0.0%'],
    [42.345, /^42[.,]3%$/],
    [100, '100%'],
    [99.95, '>99.9%'],
    [0.05, '<0.1%'],
    ['abc', '0.0%'],
  ])('formats %j as %j with default decimal places', (input, expected) => {
    const result = numUtils.formatPercentageLabel(input);

    if (expected instanceof RegExp) {
      expect(result).toMatch(expected);
    } else {
      expect(result).toBe(expected);
    }
  });

  test('keeps 100% without decimal places regardless of decimalPlaces parameter', () => {
    expect(numUtils.formatPercentageLabel(100, 0)).toBe('100%');
    expect(numUtils.formatPercentageLabel(100, 1)).toBe('100%');
    expect(numUtils.formatPercentageLabel(100, 2)).toBe('100%');
  });

  test.each([
    [0, 99.5, '>99%'],
    [1, 99.95, '>99.9%'],
    [2, 99.995, '>99.99%'],
    [3, 99.9995, '>99.999%'],
  ])('adapts upper boundary label to decimalPlaces=%j', (decimalPlaces, value, expectedBoundary) => {
    expect(numUtils.formatPercentageLabel(value, decimalPlaces)).toBe(expectedBoundary);
  });

  test.each([
    [0, 0.5, '<1%'],
    [1, 0.05, '<0.1%'],
    [2, 0.005, '<0.01%'],
    [3, 0.0005, '<0.001%'],
  ])('adapts lower boundary label to decimalPlaces=%j', (decimalPlaces, value, expectedBoundary) => {
    expect(numUtils.formatPercentageLabel(value, decimalPlaces)).toBe(expectedBoundary);
  });
});

describe('numUtils.formatShareLabel', () => {
  test.each([
    [0, 0, '0%'],
    [1, 4, /^25[.,]0%$/],
    [1, 1, '100%'],
    [999.5, 1000, '>99.9%'],
    [0.5, 1000, '<0.1%'],
    ['abc', 100, '0.0%'],
  ])('formats %j / %j as %j', (value, total, expected) => {
    const result = numUtils.formatShareLabel(value, total);

    if (expected instanceof RegExp) {
      expect(result).toMatch(expected);
    } else {
      expect(result).toBe(expected);
    }
  });
});
