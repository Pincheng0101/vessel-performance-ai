import { describe, expect, test } from 'vitest';
import json from './json';

const validate = json();
describe('json', () => {
  test('should pass with valid input', () => {
    expect(validate(`{"foo": "foo"}`)).toBe(true);
  });
  test('should fail with invalid input', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate('foo')).toBe(false);
    expect(validate('123')).toBe(false);
    expect(validate(123)).toBe(false);
  });
});
