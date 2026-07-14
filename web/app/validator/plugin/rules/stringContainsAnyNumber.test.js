import { describe, expect, test } from 'vitest';
import stringContainsAnyNumber from './stringContainsAnyNumber';

const validate = stringContainsAnyNumber();
describe('stringContainsAnyNumber', () => {
  test('should pass with valid input', () => {
    expect(validate('123')).toBe(true);
    expect(validate('abc123')).toBe(true);
    expect(validate('Password1')).toBe(true);
    expect(validate('test0')).toBe(true);
    expect(validate('9abc')).toBe(true);
  });
  test('should fail with invalid input', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate(null)).toBe(false);
    expect(validate('')).toBe(false);
    expect(validate('abc')).toBe(false);
    expect(validate('ABC')).toBe(false);
    expect(validate('Hello')).toBe(false);
    expect(validate('!@#$%')).toBe(false);
  });
});
