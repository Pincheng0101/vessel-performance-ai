import { describe, expect, test } from 'vitest';
import jsonPath from './jsonPath';

describe('jsonPath', () => {
  test('should pass with valid input', () => {
    const validate = jsonPath();
    expect(validate('$.foo')).toBe(true);
    expect(validate('$..foo')).toBe(true);
    expect(validate('$.foo.*')).toBe(true);
    expect(validate('$.foo[*].bar')).toBe(true);
    expect(validate('$.[*][*]')).toBe(true);
    expect(validate('$.[0]')).toBe(true);
    expect(validate('$[\'foo\']')).toBe(true);
    expect(validate('$$.foo')).toBe(true);
    expect(validate('$.foo.[123]')).toBe(true);
    expect(validate('States.Format(\'{}\', $.foo)')).toBe(true);
    expect(validate('$.foo.bar[*][?(@.baz < 1)]')).toBe(true);
  });

  test('should fail with invalid input', () => {
    const validate = jsonPath();
    expect(validate('foo')).toBe(false);
    expect(validate()).toBe(false);
    expect(validate('$foo')).toBe(false);
    expect(validate('.foo')).toBe(false);
    expect(validate('$.123')).toBe(false);
    expect(validate('$.foo.123bar')).toBe(false);
    expect(validate('$.foo[\'123\']')).toBe(false);
  });
});
