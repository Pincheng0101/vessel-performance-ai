import { describe, expect, test } from 'vitest';
import referencePathUtils from './referencePathUtils';

const EXTERNAL_MEMORY = { type: 'external_memory' };

describe('referencePathUtils.isReferencePath', () => {
  test('returns true for a JSONPath string', () => {
    expect(referencePathUtils.isReferencePath('$.foo')).toBe(true);
  });

  test('returns true for an external memory object', () => {
    expect(referencePathUtils.isReferencePath(EXTERNAL_MEMORY)).toBe(true);
  });

  test('returns false for unrelated values', () => {
    expect(referencePathUtils.isReferencePath('plain')).toBe(false);
  });
});

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

describe('referencePathUtils.toDollarPrefix', () => {
  test('returns "$" unchanged', () => {
    expect(referencePathUtils.toDollarPrefix('$')).toBe('$');
  });

  test('converts a .$ suffix into a $. prefix', () => {
    expect(referencePathUtils.toDollarPrefix('foo.$')).toBe('$.foo');
  });

  test('adds a $. prefix to a plain key', () => {
    expect(referencePathUtils.toDollarPrefix('foo')).toBe('$.foo');
  });
});

describe('referencePathUtils.toDollarSuffix', () => {
  test('returns "$" unchanged', () => {
    expect(referencePathUtils.toDollarSuffix('$')).toBe('$');
  });

  test('converts a $. prefix into a .$ suffix', () => {
    expect(referencePathUtils.toDollarSuffix('$.foo')).toBe('foo.$');
  });

  test('adds a .$ suffix to a plain key', () => {
    expect(referencePathUtils.toDollarSuffix('foo')).toBe('foo.$');
  });
});

describe('referencePathUtils.isExternalMemoryObject', () => {
  test('returns true for objects whose type matches an ExternalMemoryType value', () => {
    expect(referencePathUtils.isExternalMemoryObject(EXTERNAL_MEMORY)).toBe(true);
  });

  test('returns false for objects with unrecognized type', () => {
    expect(referencePathUtils.isExternalMemoryObject({ type: 'unknown' })).toBe(false);
  });

  test('returns false for non-objects', () => {
    expect(referencePathUtils.isExternalMemoryObject('x')).toBe(false);
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

describe('referencePathUtils.addSuffixes', () => {
  test('appends .$ to keys whose values are JSONPath expressions', () => {
    expect(referencePathUtils.addSuffixes({ foo: '$.bar' })).toEqual({ 'foo.$': '$.bar' });
  });

  test('appends .% to keys whose values are external memory objects', () => {
    expect(referencePathUtils.addSuffixes({ mem: EXTERNAL_MEMORY }))
      .toEqual({ 'mem.%': EXTERNAL_MEMORY });
  });

  test('leaves reserved selector keys untouched', () => {
    const input = { state_memory_input_selector: '$.x' };
    expect(referencePathUtils.addSuffixes(input)).toEqual(input);
  });

  test('does not append .$ to the literal key "jsonpath"', () => {
    expect(referencePathUtils.addSuffixes({ jsonpath: '$.x' })).toEqual({ jsonpath: '$.x' });
  });
});

describe('referencePathUtils.removeSuffixes', () => {
  test('strips .$ from keys whose values are JSONPath expressions', () => {
    expect(referencePathUtils.removeSuffixes({ 'foo.$': '$.bar' })).toEqual({ foo: '$.bar' });
  });

  test('strips .% from keys whose values are external memory objects', () => {
    expect(referencePathUtils.removeSuffixes({ 'mem.%': EXTERNAL_MEMORY }))
      .toEqual({ mem: EXTERNAL_MEMORY });
  });

  test('leaves the literal key "jsonpath" alone', () => {
    expect(referencePathUtils.removeSuffixes({ jsonpath: '$.x' })).toEqual({ jsonpath: '$.x' });
  });
});
