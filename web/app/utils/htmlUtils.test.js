// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';
import htmlUtils from './htmlUtils';

describe('htmlUtils.escape', () => {
  test.each([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ['\'', '&#039;'],
  ])('escapes %j to %j', (input, expected) => {
    expect(htmlUtils.escape(input)).toBe(expected);
  });

  test('escapes all entities in a mixed string', () => {
    expect(htmlUtils.escape('<a href="x">Tom & Jerry\'s</a>'))
      .toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#039;s&lt;/a&gt;');
  });

  test('returns an empty string unchanged', () => {
    expect(htmlUtils.escape('')).toBe('');
  });

  test('escapes the ampersand before other entities to avoid double-encoding', () => {
    expect(htmlUtils.escape('&lt;')).toBe('&amp;lt;');
  });
});

describe('htmlUtils.unescape', () => {
  test.each([
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&quot;', '"'],
    ['&#039;', '\''],
    ['&#39;', '\''],
    ['&#x27;', '\''],
    ['&apos;', '\''],
    ['&nbsp;', ' '],
  ])('unescapes %j to %j', (input, expected) => {
    expect(htmlUtils.unescape(input)).toBe(expected);
  });

  test('returns strings without ampersands unchanged', () => {
    expect(htmlUtils.unescape('plain text')).toBe('plain text');
  });

  test('round-trips through escape and unescape', () => {
    const original = '<a href="x">Tom & Jerry\'s</a>';
    expect(htmlUtils.unescape(htmlUtils.escape(original))).toBe(original);
  });
});

describe('htmlUtils.unescapeDeep', () => {
  test('unescapes a plain string', () => {
    expect(htmlUtils.unescapeDeep('Tom &amp; Jerry')).toBe('Tom & Jerry');
  });

  test('recursively unescapes nested objects and arrays', () => {
    const input = {
      query: 'SELECT * FROM users WHERE name = &quot;John&quot;',
      filters: ['a &lt; b', { note: 'Tom &amp; Jerry' }],
    };
    expect(htmlUtils.unescapeDeep(input)).toEqual({
      query: 'SELECT * FROM users WHERE name = "John"',
      filters: ['a < b', { note: 'Tom & Jerry' }],
    });
  });

  test.each([
    [null, null],
    [undefined, undefined],
    [42, 42],
    [true, true],
  ])('returns non-string primitive %j unchanged', (input, expected) => {
    expect(htmlUtils.unescapeDeep(input)).toBe(expected);
  });

  test('returns an empty object and empty array unchanged in shape', () => {
    expect(htmlUtils.unescapeDeep({})).toEqual({});
    expect(htmlUtils.unescapeDeep([])).toEqual([]);
  });

  test('leaves class instances untouched', () => {
    class Box {
      constructor() {
        this.label = 'Tom &amp; Jerry';
      }
    }
    const instance = new Box();
    expect(htmlUtils.unescapeDeep(instance)).toBe(instance);
    expect(instance.label).toBe('Tom &amp; Jerry');
  });
});
