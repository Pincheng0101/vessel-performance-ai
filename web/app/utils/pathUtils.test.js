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

describe('pathUtils.extractDirectory', () => {
  test('returns the directory portion including the trailing separator', () => {
    expect(pathUtils.extractDirectory('a/b/c', '/')).toBe('a/b/');
  });

  test('returns an empty string when the separator is absent', () => {
    expect(pathUtils.extractDirectory('abc', '/')).toBe('');
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

describe('pathUtils.removeTrailingSlash', () => {
  test('removes the trailing slash when present', () => {
    expect(pathUtils.removeTrailingSlash('a/b/')).toBe('a/b');
  });

  test('returns the input unchanged when no trailing slash exists', () => {
    expect(pathUtils.removeTrailingSlash('a/b')).toBe('a/b');
  });

  test.each([null, undefined, ''])('returns an empty string for falsy input %j', (input) => {
    expect(pathUtils.removeTrailingSlash(input)).toBe('');
  });
});

describe('pathUtils.removeLastSegment', () => {
  test('drops the last segment of a path', () => {
    expect(pathUtils.removeLastSegment('a/b/c')).toBe('a/b/');
  });

  test('normalises a trailing slash before dropping', () => {
    expect(pathUtils.removeLastSegment('a/b/c/')).toBe('a/b/');
  });

  test('returns an empty string when no segments remain', () => {
    expect(pathUtils.removeLastSegment('a')).toBe('');
  });

  test('returns an empty string for empty input', () => {
    expect(pathUtils.removeLastSegment('')).toBe('');
  });
});
