import { describe, expect, test } from 'vitest';
import pathUtils from './pathUtils';

describe('pathUtils.extractAfter', () => {
  test('returns the substring after the first separator', () => {
    expect(pathUtils.extractAfter('a/b/c', '/')).toBe('b');
  });

  test('returns an empty string when the separator is absent', () => {
    expect(pathUtils.extractAfter('abc', '/')).toBe('');
  });
});

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

describe('pathUtils.isParentOf', () => {
  test('returns true when the parent path is a prefix of the child', () => {
    expect(pathUtils.isParentOf('a/b', 'a/b/c')).toBe(true);
  });

  test('returns true when the two paths are equal', () => {
    expect(pathUtils.isParentOf('a/b', 'a/b')).toBe(true);
  });

  test('returns false for paths that share a prefix but not a segment boundary', () => {
    expect(pathUtils.isParentOf('a/b', 'a/bc')).toBe(false);
  });

  test('returns false when the child is unrelated', () => {
    expect(pathUtils.isParentOf('a/b', 'c/d')).toBe(false);
  });
});

describe('pathUtils.extractRoots', () => {
  test('collapses nested paths to their top-level roots', () => {
    expect(pathUtils.extractRoots(['a/', 'a/b/', 'c/'])).toEqual(['a/', 'c/']);
  });

  test('deduplicates identical paths', () => {
    expect(pathUtils.extractRoots(['a/', 'a/', 'b/'])).toEqual(['a/', 'b/']);
  });

  test('returns an empty array for non-array input', () => {
    expect(pathUtils.extractRoots(null)).toEqual([]);
  });
});

describe('pathUtils.extractAllFolders', () => {
  test('extracts every parent folder prefix from item objectPaths', () => {
    const items = [{ objectPath: 'a/b/c.txt' }, { objectPath: 'a/d.txt' }];
    expect(pathUtils.extractAllFolders(items)).toEqual(['a/', 'a/b/']);
  });

  test('skips items without an objectPath', () => {
    expect(pathUtils.extractAllFolders([{ objectPath: '' }, { objectPath: 'x/y.txt' }]))
      .toEqual(['x/']);
  });
});

describe('pathUtils.replacePathSegment', () => {
  test('replaces a matching prefix while preserving the remainder', () => {
    expect(pathUtils.replacePathSegment('folder2/folder2-2/folder2-2/.keep', 'folder2/folder2-2/', 'folder2-3'))
      .toBe('folder2/folder2-3/folder2-2/.keep');
  });

  test('returns the original path when the prefix does not match', () => {
    expect(pathUtils.replacePathSegment('x/y/z', 'a/', 'b/')).toBeUndefined();
  });

  test('returns the original path when the replacement segment is empty', () => {
    expect(pathUtils.replacePathSegment('a/b', 'a/', '')).toBe('a/b');
  });

  test('returns an empty string for empty fullPath', () => {
    expect(pathUtils.replacePathSegment('', 'a/', 'b/')).toBe('');
  });
});

describe('pathUtils.removeParentPath', () => {
  test('strips the parent prefix when present', () => {
    expect(pathUtils.removeParentPath('folder1/folder2/file.txt', 'folder1/')).toBe('folder2/file.txt');
  });

  test('returns the original path when the prefix is absent', () => {
    expect(pathUtils.removeParentPath('folder1/file.txt', 'other/')).toBe('folder1/file.txt');
  });
});
