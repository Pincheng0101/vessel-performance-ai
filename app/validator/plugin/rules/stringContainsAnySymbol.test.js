import { describe, expect, test } from 'vitest';
import stringContainsAnySymbol from './stringContainsAnySymbol';

const validate = stringContainsAnySymbol();
describe('stringContainsAnySymbol', () => {
  test('should pass with valid input', () => {
    expect(validate('!@#')).toBe(true);
    expect(validate('abc!')).toBe(true);
    expect(validate('Password@123')).toBe(true);
    expect(validate('test#')).toBe(true);
    expect(validate('hello_world')).toBe(true);
    expect(validate('path/to/file')).toBe(true);
    expect(validate('email@domain.com')).toBe(true);
    expect(validate('key=value')).toBe(true);
    expect(validate('a-b')).toBe(true);
    expect(validate('a+b')).toBe(true);
  });
  test('should fail with invalid input', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate(null)).toBe(false);
    expect(validate('')).toBe(false);
    expect(validate('abc')).toBe(false);
    expect(validate('ABC')).toBe(false);
    expect(validate('123')).toBe(false);
    expect(validate('Hello123')).toBe(false);
  });
});
