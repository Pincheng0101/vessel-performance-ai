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

describe('arrUtils.isEmpty', () => {
  test('returns true for an empty array', () => {
    expect(arrUtils.isEmpty([])).toBe(true);
  });

  test('returns false for a non-empty array', () => {
    expect(arrUtils.isEmpty([1])).toBe(false);
  });

  test.each([null, undefined, '', {}])('returns false for non-array %j', (input) => {
    expect(arrUtils.isEmpty(input)).toBe(false);
  });
});

describe('arrUtils.isArrayOfString', () => {
  test('returns true when every element is a string', () => {
    expect(arrUtils.isArrayOfString(['a', 'b'])).toBe(true);
  });

  test('returns true for an empty array', () => {
    expect(arrUtils.isArrayOfString([])).toBe(true);
  });

  test('returns false when any element is not a string', () => {
    expect(arrUtils.isArrayOfString(['a', 1])).toBe(false);
  });

  test('returns false for non-array input', () => {
    expect(arrUtils.isArrayOfString('abc')).toBe(false);
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

describe('arrUtils.deduplicateByKey', () => {
  test('keeps the latest value at the first-seen position when deduplicating by id', () => {
    const items = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 1, n: 'c' }];
    expect(arrUtils.deduplicateByKey(items)).toEqual([{ id: 1, n: 'c' }, { id: 2, n: 'b' }]);
  });

  test('deduplicates by a custom key', () => {
    const items = [{ slug: 'a' }, { slug: 'b' }, { slug: 'a' }];
    expect(arrUtils.deduplicateByKey(items, 'slug')).toHaveLength(2);
  });

  test('returns an empty array for non-array input', () => {
    expect(arrUtils.deduplicateByKey(undefined)).toEqual([]);
  });
});

describe('arrUtils.isEqualUnordered', () => {
  test('returns true when arrays contain the same items in any order', () => {
    expect(arrUtils.isEqualUnordered([1, 2, 3], [3, 1, 2])).toBe(true);
  });

  test('returns false when any item differs', () => {
    expect(arrUtils.isEqualUnordered([1, 2], [1, 3])).toBe(false);
  });

  test('returns false when lengths differ', () => {
    expect(arrUtils.isEqualUnordered([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe('arrUtils.isEqualOrdered', () => {
  test('returns true when arrays match in order and length', () => {
    expect(arrUtils.isEqualOrdered([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  test('returns false when items are in different order', () => {
    expect(arrUtils.isEqualOrdered([1, 2], [2, 1])).toBe(false);
  });

  test('returns false when lengths differ', () => {
    expect(arrUtils.isEqualOrdered([1], [1, 2])).toBe(false);
  });
});

describe('arrUtils.diffObjectByKey', () => {
  test('classifies items into added, removed, and changed by the default id key', () => {
    const current = [{ id: 1, v: 'a' }, { id: 2, v: 'b' }];
    const updated = [{ id: 2, v: 'B' }, { id: 3, v: 'c' }];
    expect(arrUtils.diffObjectByKey(current, updated, {})).toEqual({
      added: [{ id: 3, v: 'c' }],
      removed: [{ id: 1, v: 'a' }],
      changed: [{ id: 2, from: { id: 2, v: 'b' }, to: { id: 2, v: 'B' } }],
    });
  });

  test('uses a custom key to match items', () => {
    const current = [{ slug: 'a', v: 1 }];
    const updated = [{ slug: 'a', v: 2 }];
    expect(arrUtils.diffObjectByKey(current, updated, { key: 'slug' }).changed).toHaveLength(1);
  });

  test('suppresses change entries when the isChanged callback returns false', () => {
    const current = [{ id: 1, v: 'a' }];
    const updated = [{ id: 1, v: 'b' }];
    const result = arrUtils.diffObjectByKey(current, updated, { isChanged: () => false });
    expect(result.changed).toEqual([]);
  });
});

describe('arrUtils.collectValues', () => {
  test('collects values from simple dot paths', () => {
    const data = [{ a: { b: 1 } }, { a: { b: 2 } }];
    expect(arrUtils.collectValues(data, ['a.b'])).toEqual([1, 2]);
  });

  test('flattens array segments expressed with "[]"', () => {
    const data = [{ tags: ['x', 'y'] }, { tags: ['y', 'z'] }];
    expect(arrUtils.collectValues(data, ['tags[]']).sort()).toEqual(['x', 'y', 'z']);
  });

  test('deduplicates collected values and skips null/undefined', () => {
    const data = [{ v: 1 }, { v: 1 }, { v: null }, { v: undefined }];
    expect(arrUtils.collectValues(data, ['v'])).toEqual([1]);
  });

  test('returns an empty array for non-array input', () => {
    expect(arrUtils.collectValues(null, ['x'])).toEqual([]);
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
