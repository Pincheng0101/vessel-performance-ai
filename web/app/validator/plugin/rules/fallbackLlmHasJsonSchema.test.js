import { describe, expect, test } from 'vitest';
import fallbackLlmHasJsonSchema from './fallbackLlmHasJsonSchema';

const validate = fallbackLlmHasJsonSchema();
describe('fallbackLlmHasJsonSchema', () => {
  test('should fail when value is empty', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate(null)).toBe(false);
    expect(validate([])).toBe(false);
  });

  test('should pass when all items have valid jsonSchema', () => {
    expect(validate([
      { llmId: '1', jsonSchema: { type: 'object' } },
      { llmId: '2', jsonSchema: { type: 'string' } },
    ])).toBe(true);
  });

  test('should fail when any item is missing or has empty jsonSchema', () => {
    expect(validate([
      { llmId: '1', jsonSchema: { type: 'object' } },
      { llmId: '2', jsonSchema: undefined },
    ])).toBe(false);
    expect(validate([
      { llmId: '1', jsonSchema: { type: 'object' } },
      { llmId: '2', jsonSchema: {} },
    ])).toBe(false);
  });

  test('should pass when value is not an array', () => {
    expect(validate('string')).toBe(true);
    expect(validate(123)).toBe(true);
  });
});
