// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import fileUtils from './fileUtils';

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

describe('fileUtils.toBase64', () => {
  test('reads a Blob into a data URL string', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const result = await fileUtils.toBase64(blob);
    expect(result.startsWith('data:text/plain;base64,')).toBe(true);
  });
});

describe('fileUtils.parseFromBase64', () => {
  test('extracts the media type and data from a valid data URL', () => {
    expect(fileUtils.parseFromBase64(PNG_DATA_URL)).toEqual({
      mediaType: 'image/png',
      data: 'iVBORw0KGgo=',
    });
  });

  test('returns null for non-data-URL strings', () => {
    expect(fileUtils.parseFromBase64('not a data url')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(fileUtils.parseFromBase64(123)).toBeNull();
  });
});

describe('fileUtils.getDataUrlByteLength', () => {
  test('returns the decoded byte length, subtracting padding', () => {
    expect(fileUtils.getDataUrlByteLength(PNG_DATA_URL)).toBe(8);
  });

  test('returns 0 when the data URL cannot be parsed', () => {
    expect(fileUtils.getDataUrlByteLength('not a data url')).toBe(0);
  });
});

describe('fileUtils.setRelativePath', () => {
  test('attaches the webkitRelativePath property to a File copy', () => {
    const original = new File(['x'], 'a.txt');
    const result = fileUtils.setRelativePath(original, 'folder/a.txt');
    expect(result.webkitRelativePath).toBe('folder/a.txt');
  });
});

describe('fileUtils.getFileType', () => {
  test('returns the file.type when present', () => {
    expect(fileUtils.getFileType({ name: 'a.txt', type: 'text/plain' })).toBe('text/plain');
  });

  test('falls back to contentType when type is missing', () => {
    expect(fileUtils.getFileType({ name: 'a.txt', contentType: 'text/markdown' })).toBe('text/markdown');
  });

  test('returns an empty string when both type and extension are absent', () => {
    expect(fileUtils.getFileType({ name: 'no-extension' })).toBe('');
  });
});
