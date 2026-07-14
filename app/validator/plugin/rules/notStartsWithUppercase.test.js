import { describe, expect, test } from 'vitest';
import notStartsWithUppercase from './notStartsWithUppercase';

const validate = notStartsWithUppercase();

describe('notStartsWithUppercase', () => {
  test('should pass with names that do not start with uppercase letter', () => {
    expect(validate('action_type')).toBe(true);
    expect(validate('parameters')).toBe(true);
    expect(validate('user_id')).toBe(true);
    expect(validate('a_b_c')).toBe(true);
  });

  test('should fail with names that start with uppercase letter', () => {
    expect(validate('Item')).toBe(false);
    expect(validate('Data')).toBe(false);
    expect(validate('Result')).toBe(false);
    expect(validate('UserId')).toBe(false);
  });

  test('should pass with non-letter starting characters (digits and underscore are checked by other rules)', () => {
    expect(validate('_id')).toBe(true);
    expect(validate('1abc')).toBe(true);
  });

  test('should skip on empty input (defer to required)', () => {
    expect(validate(undefined)).toBe(true);
    expect(validate(null)).toBe(true);
    expect(validate('')).toBe(true);
  });
});
