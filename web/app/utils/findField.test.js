import { describe, expect, test } from 'vitest';
import findField from './findField';

const FRUITS = {
  apple: { value: 'apple', label: 'Apple', color: 'red' },
  banana: { value: 'banana', label: 'Banana', color: 'yellow' },
};

describe('findField', () => {
  test('returns the requested field when matched by the default value key', () => {
    expect(findField(FRUITS, 'apple', 'label')).toBe('Apple');
  });

  test('returns the requested field when matched by a custom searchKey', () => {
    expect(findField(FRUITS, 'yellow', 'label', 'color')).toBe('Banana');
  });

  test('returns null when no item matches', () => {
    expect(findField(FRUITS, 'cherry', 'label')).toBeNull();
  });

  test('returns the original searchValue when items is nullish', () => {
    expect(findField(null, 'apple', 'label')).toBe('apple');
    expect(findField(undefined, 'apple', 'label')).toBe('apple');
  });

  test('works with array-shaped collections', () => {
    const items = [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }];
    expect(findField(items, 'y', 'label')).toBe('Y');
  });
});
