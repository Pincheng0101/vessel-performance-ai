import { describe, expect, test } from 'vitest';
import jsonPathBinding from './jsonPathBinding';

describe('jsonPathBinding', () => {
  test('should pass with valid input', () => {
    const validate = jsonPathBinding();
    expect(validate(`{"foo.$": "$.foo"}`)).toBe(true);
  });

  test('should fail with invalid input', () => {
    const validate = jsonPathBinding();
    expect(validate(`{"foo": "$.foo"}`)).toBe(false);
    expect(validate(`{"$.foo": "$.foo"}`)).toBe(false);
    expect(validate(`{"foo.$": "$foo"}`)).toBe(false);
  });
});
