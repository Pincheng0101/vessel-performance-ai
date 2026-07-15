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
