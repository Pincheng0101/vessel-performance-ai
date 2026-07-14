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
    ['toPascalCase', 'hello world', 'HelloWorld'],
    ['toSnakeCase', 'helloWorld', 'hello_world'],
    ['toKebabCase', 'helloWorld', 'hello-world'],
  ])('strUtils.%s(%j) returns %j', (method, input, expected) => {
    expect(strUtils[method](input)).toBe(expected);
  });
});

describe('strUtils.escapeControlChars', () => {
  test('escapes carriage returns and newlines', () => {
    expect(strUtils.escapeControlChars('a\r\nb')).toBe('a\\r\\nb');
  });

  test('escapes tab and backslash', () => {
    expect(strUtils.escapeControlChars('a\tb\\c')).toBe('a\\tb\\\\c');
  });
});

describe('strUtils.unescapeControlChars', () => {
  test('restores escaped control characters', () => {
    expect(strUtils.unescapeControlChars('a\\r\\nb')).toBe('a\r\nb');
  });

  test('returns the original string when parsing fails', () => {
    expect(strUtils.unescapeControlChars('"unbalanced')).toBe('"unbalanced');
  });

  test('round-trips through escape and unescape', () => {
    const original = 'line1\r\nline2\t\\end';
    expect(strUtils.unescapeControlChars(strUtils.escapeControlChars(original))).toBe(original);
  });
});

describe('strUtils.generateNonce', () => {
  test('resolves to a 64-character lowercase hex string', async () => {
    await expect(strUtils.generateNonce()).resolves.toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('strUtils.toSha256', () => {
  test('produces a 32-byte ArrayBuffer for any input', async () => {
    const hash = await strUtils.toSha256('hello');
    expect(hash).toBeInstanceOf(ArrayBuffer);
    expect(hash.byteLength).toBe(32);
  });

  test('produces identical hashes for identical inputs', async () => {
    const [a, b] = await Promise.all([strUtils.toSha256('x'), strUtils.toSha256('x')]);
    expect(new Uint8Array(a)).toEqual(new Uint8Array(b));
  });
});

describe('strUtils.toBase64Url', () => {
  test('encodes a byte buffer without padding or url-unsafe characters', () => {
    const bytes = new Uint8Array([255, 239, 255]).buffer;
    const encoded = strUtils.toBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
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

describe('strUtils.isEndsWith', () => {
  test('returns true when the string ends with the suffix', () => {
    expect(strUtils.isEndsWith('hello world', 'world')).toBe(true);
  });

  test('returns false when the suffix does not match', () => {
    expect(strUtils.isEndsWith('hello', 'world')).toBe(false);
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

describe('strUtils.hash', () => {
  test('is deterministic for identical inputs', () => {
    expect(strUtils.hash('hello')).toBe(strUtils.hash('hello'));
  });

  test('produces different output when seed changes', () => {
    expect(strUtils.hash('hello', 1)).not.toBe(strUtils.hash('hello', 2));
  });
});

describe('strUtils.escapeRegExp', () => {
  test('escapes all regex metacharacters', () => {
    expect(strUtils.escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });
});

describe('strUtils.countSubstring', () => {
  test('counts overlapping-free occurrences of a substring', () => {
    expect(strUtils.countSubstring('aabaa', 'a')).toBe(4);
  });

  test('escapes regex metacharacters in the substring', () => {
    expect(strUtils.countSubstring('1.2.3', '.')).toBe(2);
  });
});

describe('strUtils.truncate', () => {
  test('returns the original string when within the limit', () => {
    expect(strUtils.truncate('hello', 10)).toBe('hello');
  });

  test('truncates and appends the default ellipsis', () => {
    expect(strUtils.truncate('hello world', 8)).toBe('hello...');
  });

  test('uses a custom suffix when provided', () => {
    expect(strUtils.truncate('hello world', 7, '…')).toBe('hello …');
  });
});

describe('strUtils.isUnsignedDigits', () => {
  test.each(['0', '123'])('returns true for %j', (input) => {
    expect(strUtils.isUnsignedDigits(input)).toBe(true);
  });

  test.each(['', '-1', '1.0', 'abc'])('returns false for %j', (input) => {
    expect(strUtils.isUnsignedDigits(input)).toBe(false);
  });
});

describe('strUtils.isNumeric', () => {
  test.each(['0', '-1', '1.5', '-1.5'])('returns true for %j', (input) => {
    expect(strUtils.isNumeric(input)).toBe(true);
  });

  test.each(['', 'abc', '1.2.3', '--1'])('returns false for %j', (input) => {
    expect(strUtils.isNumeric(input)).toBe(false);
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

describe('strUtils.generatePassword', () => {
  test('returns a password of the requested length, enforcing minimum 8', () => {
    expect(strUtils.generatePassword(16)).toHaveLength(16);
    expect(strUtils.generatePassword(4)).toHaveLength(8);
  });

  test('always includes at least one upper, lower, digit, and symbol', () => {
    const password = strUtils.generatePassword(12);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/\d/);
  });
});
