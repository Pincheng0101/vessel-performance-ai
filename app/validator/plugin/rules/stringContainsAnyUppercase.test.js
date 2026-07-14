import { describe, expect, test } from 'vitest';
import stringContainsAnyUppercase from './stringContainsAnyUppercase';

const validate = stringContainsAnyUppercase();
describe('stringContainsAnyUppercase', () => {
  test('should pass with valid input', () => {
    expect(validate('ABC')).toBe(true);
    expect(validate('abc123ABC')).toBe(true);
    expect(validate('Hello')).toBe(true);
    expect(validate('Test123')).toBe(true);
    expect(validate('aBcDeF')).toBe(true);
  });
  test('should fail with invalid input', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate(null)).toBe(false);
    expect(validate('')).toBe(false);
    expect(validate('abc')).toBe(false);
    expect(validate('123')).toBe(false);
    expect(validate('abc123')).toBe(false);
    expect(validate('!@#$%')).toBe(false);
  });
});
