// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import urlUtils from './urlUtils';

describe('urlUtils.toAbsolute', () => {
  test('returns an empty string for falsy input', () => {
    expect(urlUtils.toAbsolute('')).toBe('');
    expect(urlUtils.toAbsolute(null)).toBe('');
  });

  test.each(['http://example.com/x', 'https://example.com/y'])(
    'passes through absolute URL %j unchanged',
    (input) => {
      expect(urlUtils.toAbsolute(input)).toBe(input);
    },
  );

  test('resolves a relative path against window.location.origin', () => {
    expect(urlUtils.toAbsolute('/foo')).toBe(`${window.location.origin}/foo`);
  });

  test('prepends a leading slash when the path does not start with one', () => {
    expect(urlUtils.toAbsolute('foo')).toBe(`${window.location.origin}/foo`);
  });
});
