import { describe, expect, test } from 'vitest';
import strUtils from './strUtils';

describe('strUtils.uuid', () => {
  test('returns a v4-shaped UUID string', () => {
    expect(strUtils.uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('strUtils.capitalize', () => {
  test('uppercases only the first character', () => {
    expect(strUtils.capitalize('hello world')).toBe('Hello world');
  });
});

describe('strUtils.toTitleCase', () => {
  test('title-cases space-separated words', () => {
    expect(strUtils.toTitleCase('hello world')).toBe('Hello World');
  });

  test('treats dashes and underscores as word separators', () => {
    expect(strUtils.toTitleCase('foo-bar_baz')).toBe('Foo Bar Baz');
  });

  test.each(['FAQ', 'HTTP', 'LLM', 'OpenSearch', 'MySQL', 'SDK', 'SQL'])(
    'preserves special term %j',
    (term) => {
      expect(strUtils.toTitleCase(term.toLowerCase())).toContain(term);
    },
  );

  test('uppercases API/ID/URL only on word boundaries', () => {
    expect(strUtils.toTitleCase('api id url')).toBe('API ID URL');
    expect(strUtils.toTitleCase('therapist')).toBe('Therapist');
  });
});

describe('strUtils case converters', () => {
  test.each([
    ['toCamelCase', 'hello world', 'helloWorld'],
    ['toSnakeCase', 'helloWorld', 'hello_world'],
    ['toKebabCase', 'helloWorld', 'hello-world'],
  ])('strUtils.%s(%j) returns %j', (method, input, expected) => {
    expect(strUtils[method](input)).toBe(expected);
  });
});

describe('strUtils.isStartsWith', () => {
  test('returns true when the string starts with the prefix', () => {
    expect(strUtils.isStartsWith('hello world', 'hello')).toBe(true);
  });

  test('returns false when the prefix does not match', () => {
    expect(strUtils.isStartsWith('hello', 'world')).toBe(false);
  });
});

describe('strUtils.generateRandom', () => {
  test('produces a string of the requested length using the default charset', () => {
    const result = strUtils.generateRandom(20);
    expect(result).toHaveLength(20);
    expect(result).toMatch(/^[A-Za-z0-9]{20}$/);
  });

  test('uses a custom charset when provided', () => {
    expect(strUtils.generateRandom(10, 'a')).toBe('aaaaaaaaaa');
  });
});

describe('strUtils.addSpacesAroundAscii', () => {
  test('inserts spaces between ASCII and non-ASCII boundaries', () => {
    expect(strUtils.addSpacesAroundAscii('中文text混合')).toBe('中文 text 混合');
  });

  test('collapses runs of multiple spaces into single spaces', () => {
    expect(strUtils.addSpacesAroundAscii('a  b')).toBe('a b');
  });
});

describe('strUtils.isValidUrl', () => {
  test.each(['http://example.com', 'https://example.com'])(
    'returns true for %j',
    (input) => {
      expect(strUtils.isValidUrl(input)).toBe(true);
    },
  );

  test.each(['ftp://x', 'example.com', ''])('returns false for %j', (input) => {
    expect(strUtils.isValidUrl(input)).toBe(false);
  });
});

describe('strUtils.isEmpty', () => {
  test.each(['', '   ', '\n\t', null, undefined])('returns true for %j', (input) => {
    expect(strUtils.isEmpty(input)).toBe(true);
  });

  test('returns false for a non-empty string', () => {
    expect(strUtils.isEmpty('x')).toBe(false);
  });
});

describe('strUtils.hasMarkdownStructure', () => {
  test.each([
    '```code```',
    '# heading',
    '| a | b |\n| - | - |',
    '**bold**',
    '- bullet',
    '1. numbered',
  ])('detects markdown structure in %j', (input) => {
    expect(strUtils.hasMarkdownStructure(input)).toBe(true);
  });

  test.each(['plain text', '', null])('returns false for non-markdown input %j', (input) => {
    expect(strUtils.hasMarkdownStructure(input)).toBe(false);
  });
});
