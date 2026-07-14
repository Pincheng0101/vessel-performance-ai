import { describe, expect, test } from 'vitest';
import mathUtils from './mathUtils';

describe('mathUtils.sum', () => {
  test('sums a spread of numbers', () => {
    expect(mathUtils.sum(1, 2, 3)).toBe(6);
  });

  test('sums a single array argument', () => {
    expect(mathUtils.sum([1, 2, 3])).toBe(6);
  });

  test.each([
    [[], 0],
    [[0], 0],
    [[-1, -2, 3], 0],
    [[1.5, 2.5], 4],
  ])('sums %j to %j', (input, expected) => {
    expect(mathUtils.sum(input)).toBe(expected);
  });

  test('returns 0 when called with no arguments', () => {
    expect(mathUtils.sum()).toBe(0);
  });
});

describe('mathUtils.average', () => {
  test('averages a spread of numbers', () => {
    expect(mathUtils.average(2, 4, 6)).toBe(4);
  });

  test('averages a single array argument', () => {
    expect(mathUtils.average([2, 4, 6])).toBe(4);
  });

  test('returns 0 for empty array input', () => {
    expect(mathUtils.average([])).toBe(0);
  });

  test('returns 0 when called with no arguments', () => {
    expect(mathUtils.average()).toBe(0);
  });
});
