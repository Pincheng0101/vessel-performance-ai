import { describe, expect, test } from 'vitest';
import arrUtils from './arrUtils';

describe('arrUtils.cast', () => {
  test('returns the same reference when input is already an array', () => {
    const input = [1, 2];
    expect(arrUtils.cast(input)).toBe(input);
  });

  test('wraps a non-array value in an array', () => {
    expect(arrUtils.cast('x')).toEqual(['x']);
  });
});

describe('arrUtils.deduplicate', () => {
  test('removes duplicate primitives preserving first occurrence order', () => {
    expect(arrUtils.deduplicate([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  test('returns an empty array for non-array input', () => {
    expect(arrUtils.deduplicate(null)).toEqual([]);
  });
});

describe('arrUtils.shuffle', () => {
  test('returns an array containing the same elements as the input', () => {
    const input = [1, 2, 3, 4, 5];
    expect(arrUtils.shuffle(input).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('does not mutate the input array', () => {
    const input = [1, 2, 3];
    arrUtils.shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });

  test('returns a single-element array unchanged', () => {
    expect(arrUtils.shuffle(['only'])).toEqual(['only']);
  });

  test('returns an empty array for empty input', () => {
    expect(arrUtils.shuffle([])).toEqual([]);
  });

  test('returns an empty array for non-array input', () => {
    expect(arrUtils.shuffle(null)).toEqual([]);
  });
});
