import { describe, expect, test } from 'vitest';
import notStartsWithUnderscore from './notStartsWithUnderscore';

const validate = notStartsWithUnderscore();

describe('notStartsWithUnderscore', () => {
  test('should pass with names that do not start with underscore', () => {
    expect(validate('action_type')).toBe(true);
    expect(validate('parameters')).toBe(true);
    expect(validate('userId')).toBe(true);
    expect(validate('a_b_c')).toBe(true);
  });

  test('should fail with names that start with underscore', () => {
    expect(validate('_id')).toBe(false);
    expect(validate('_lfe_system')).toBe(false);
    expect(validate('__dunder')).toBe(false);
  });

  test('should skip on empty input (defer to required)', () => {
    expect(validate(undefined)).toBe(true);
    expect(validate(null)).toBe(true);
    expect(validate('')).toBe(true);
  });
});
