import { describe, expect, test } from 'vitest';
import pathUtils from './pathUtils';

describe('pathUtils.extractLast', () => {
  test('returns the final segment before a separator', () => {
    expect(pathUtils.extractLast('a/b/c')).toBe('c');
  });

  test('strips a trailing separator before extracting', () => {
    expect(pathUtils.extractLast('a/b/c/')).toBe('c');
  });

  test('returns the input unchanged when the separator is absent', () => {
    expect(pathUtils.extractLast('abc')).toBe('abc');
  });

  test('supports a custom separator', () => {
    expect(pathUtils.extractLast('a.b.c', '.')).toBe('c');
  });
});

describe('pathUtils.getFileExtension', () => {
  test.each([
    ['photo.PNG', '.png'],
    ['folder.v1/report.CSV', '.csv'],
    ['archive.tar.gz', '.gz'],
    ['no-extension', ''],
  ])('returns the lowercased extension for %j', (path, expected) => {
    expect(pathUtils.getFileExtension(path)).toBe(expected);
  });

  test.each([null, undefined, ''])('returns an empty string for falsy input %j', (input) => {
    expect(pathUtils.getFileExtension(input)).toBe('');
  });
});

describe('pathUtils.appendTrailingSlash', () => {
  test('appends a slash when missing', () => {
    expect(pathUtils.appendTrailingSlash('a/b')).toBe('a/b/');
  });

  test('does not double-append when a slash is already present', () => {
    expect(pathUtils.appendTrailingSlash('a/b/')).toBe('a/b/');
  });

  test.each([null, undefined, ''])('returns an empty string for falsy input %j', (input) => {
    expect(pathUtils.appendTrailingSlash(input)).toBe('');
  });
});
