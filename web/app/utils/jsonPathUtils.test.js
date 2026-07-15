import { describe, expect, test } from 'vitest';
import jsonPathUtils from './jsonPathUtils';

describe('jsonPathUtils.isJsonPath', () => {
  test('accepts the root path "$"', () => {
    expect(jsonPathUtils.isJsonPath('$')).toBe(true);
  });

  test.each(['$.foo', '$.foo.bar', '$[0]', '$$.foo'])('accepts %j', (input) => {
    expect(jsonPathUtils.isJsonPath(input)).toBe(true);
  });

  test.each(['', 'foo', '$.123foo', `$['1abc']`])('rejects %j', (input) => {
    expect(jsonPathUtils.isJsonPath(input)).toBe(false);
  });

  test('returns false for non-string input', () => {
    expect(jsonPathUtils.isJsonPath(null)).toBe(false);
  });
});
