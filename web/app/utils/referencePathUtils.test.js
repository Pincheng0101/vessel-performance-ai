import { describe, expect, test } from 'vitest';
import referencePathUtils from './referencePathUtils';

describe('referencePathUtils.hasDollarPrefix', () => {
  test.each(['$', '$.foo'])('returns true for %j', (input) => {
    expect(referencePathUtils.hasDollarPrefix(input)).toBe(true);
  });

  test.each(['foo', '$foo', 'foo.$'])('returns false for %j', (input) => {
    expect(referencePathUtils.hasDollarPrefix(input)).toBe(false);
  });
});

describe('referencePathUtils.hasDollarSuffix', () => {
  test('returns true when the string ends with .$', () => {
    expect(referencePathUtils.hasDollarSuffix('foo.$')).toBe(true);
  });

  test('returns false when the suffix is missing', () => {
    expect(referencePathUtils.hasDollarSuffix('foo')).toBe(false);
  });
});

describe('referencePathUtils.hasPercentSuffix', () => {
  test('returns true when the string ends with .%', () => {
    expect(referencePathUtils.hasPercentSuffix('foo.%')).toBe(true);
  });

  test('returns false when the suffix is missing', () => {
    expect(referencePathUtils.hasPercentSuffix('foo')).toBe(false);
  });
});

describe('referencePathUtils.findInvalidJsonPathBindings', () => {
  test('flags a JSONPath value bound to a key without the .$ suffix', () => {
    const errors = referencePathUtils.findInvalidJsonPathBindings({ foo: '$.bar' });
    expect(errors).toEqual([
      { type: 'key', key: 'foo', value: '$.bar', path: ['foo'] },
    ]);
  });

  test('flags a non-JSONPath value bound to a key ending with .$', () => {
    const errors = referencePathUtils.findInvalidJsonPathBindings({ 'foo.$': 'plain' });
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('value');
  });

  test('returns an empty array for non-object input', () => {
    expect(referencePathUtils.findInvalidJsonPathBindings('x')).toEqual([]);
  });

  test('recurses into nested objects and arrays', () => {
    const errors = referencePathUtils.findInvalidJsonPathBindings({
      nested: { 'foo.$': 'not a path' },
      arr: [{ key: '$.x' }],
    });
    expect(errors).toHaveLength(2);
  });
});
