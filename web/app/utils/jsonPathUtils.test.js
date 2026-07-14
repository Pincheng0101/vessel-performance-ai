import { describe, expect, test } from 'vitest';
import jsonPathUtils from './jsonPathUtils';

describe('jsonPathUtils.parsePathTokens', () => {
  test('splits a dot-notation path into ordered tokens', () => {
    expect(jsonPathUtils.parsePathTokens('$.foo.bar.baz')).toEqual([['foo', 'bar', 'baz']]);
  });

  test('reads tokens from bracket notation with both quote styles', () => {
    expect(jsonPathUtils.parsePathTokens(`$['foo']["bar"]`)).toEqual([['foo', 'bar']]);
  });

  test('captures wildcard and numeric index tokens verbatim', () => {
    expect(jsonPathUtils.parsePathTokens('$[*][0]')).toEqual([['*', '0']]);
  });

  test('extracts every JSONPath expression embedded in the input string', () => {
    expect(jsonPathUtils.parsePathTokens('a $.foo b $.bar')).toEqual([['foo'], ['bar']]);
  });

  test('returns an empty array when no JSONPath expression is present', () => {
    expect(jsonPathUtils.parsePathTokens('plain text')).toEqual([]);
  });
});

describe('jsonPathUtils.generateJsonFromPath', () => {
  test('builds a nested object skeleton from a dot-notation path', () => {
    expect(jsonPathUtils.generateJsonFromPath('$.a.b.c')).toEqual({ a: { b: { c: '' } } });
  });

  test('returns an empty object when the path starts with a numeric index', () => {
    expect(jsonPathUtils.generateJsonFromPath('$.[0].foo')).toEqual({});
  });

  test('returns an empty object when no tokens are extracted', () => {
    expect(jsonPathUtils.generateJsonFromPath('not a path')).toEqual({});
  });
});

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

describe('jsonPathUtils.query', () => {
  const data = { foo: { bar: 42 }, arr: [10, 20, 30] };

  test('returns matching values for a valid JSONPath', () => {
    expect(jsonPathUtils.query(data, '$.foo.bar')).toEqual([42]);
  });

  test('returns an empty array when the path is valid but matches nothing', () => {
    expect(jsonPathUtils.query(data, '$.missing')).toEqual([]);
  });

  test('returns null for invalid JSONPath input', () => {
    expect(jsonPathUtils.query(data, 'not a path')).toBeNull();
  });
});

describe('jsonPathUtils.generateTemplate', () => {
  test('returns empty template containers for non-object input', () => {
    expect(jsonPathUtils.generateTemplate(null))
      .toEqual({ inputTemplate: {}, externalMemoryInputTemplate: {} });
  });

  test('skips ignored template fields like outputSelector', () => {
    const { inputTemplate } = jsonPathUtils.generateTemplate({ outputSelector: '$.x' });
    expect(inputTemplate).toEqual({});
  });

  test('expands string JSONPath values into nested skeletons in the input template', () => {
    const { inputTemplate } = jsonPathUtils.generateTemplate({ foo: '$.a.b' });
    expect(inputTemplate).toEqual({ a: { b: '' } });
  });
});
