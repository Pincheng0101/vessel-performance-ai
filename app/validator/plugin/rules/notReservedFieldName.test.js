import { describe, expect, test } from 'vitest';
import notReservedFieldName from './notReservedFieldName';

const validate = notReservedFieldName();

describe('notReservedFieldName', () => {
  test('should pass with non-reserved names', () => {
    expect(validate('action_type')).toBe(true);
    expect(validate('parameters')).toBe(true);
    expect(validate('user_id')).toBe(true);
    expect(validate('query')).toBe(true);
    expect(validate('result_data')).toBe(true);
  });

  test('should fail with Python keywords', () => {
    expect(validate('from')).toBe(false);
    expect(validate('class')).toBe(false);
    expect(validate('lambda')).toBe(false);
    expect(validate('return')).toBe(false);
    expect(validate('import')).toBe(false);
    expect(validate('True')).toBe(false);
    expect(validate('None')).toBe(false);
    expect(validate('match')).toBe(false);
  });

  test('should fail with Pydantic reserved attributes', () => {
    expect(validate('schema')).toBe(false);
    expect(validate('copy')).toBe(false);
    expect(validate('dict')).toBe(false);
    expect(validate('json')).toBe(false);
    expect(validate('validate')).toBe(false);
    expect(validate('model_dump')).toBe(false);
    expect(validate('model_config')).toBe(false);
    expect(validate('fields')).toBe(false);
  });

  test('should be case-sensitive', () => {
    // Python keywords are case-sensitive; "Class" and "FROM" are not reserved.
    expect(validate('Class')).toBe(true);
    expect(validate('FROM')).toBe(true);
    expect(validate('Schema')).toBe(true);
  });

  test('should match exactly — surrounding whitespace bypasses the reserved set', () => {
    // The validator chain layers `alphaDash` which rejects whitespace separately,
    // so the reserved-name rule alone treats ' class' / 'class ' as non-reserved.
    expect(validate(' class')).toBe(true);
    expect(validate('class ')).toBe(true);
    expect(validate(' from ')).toBe(true);
  });

  test('should skip on empty input (defer to required)', () => {
    expect(validate(undefined)).toBe(true);
    expect(validate(null)).toBe(true);
    expect(validate('')).toBe(true);
  });
});
