import { describe, expect, test } from 'vitest';
import stringContainsAnyLowercase from './stringContainsAnyLowercase';

const validate = stringContainsAnyLowercase();
describe('stringContainsAnyLowercase', () => {
  test('should pass with valid input', () => {
    expect(validate('abc')).toBe(true);
    expect(validate('ABC123abc')).toBe(true);
    expect(validate('Hello')).toBe(true);
    expect(validate('test123')).toBe(true);
    expect(validate('aBcDeF')).toBe(true);
  });
  test('should fail with invalid input', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate(null)).toBe(false);
    expect(validate('')).toBe(false);
    expect(validate('ABC')).toBe(false);
    expect(validate('123')).toBe(false);
    expect(validate('ABC123')).toBe(false);
    expect(validate('!@#$%')).toBe(false);
  });
});
