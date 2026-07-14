import { describe, expect, test } from 'vitest';
import chatUtils from './chatUtils';

describe('chatUtils.extractReferencedIndices', () => {
  test('extracts numeric indices from bare bracket patterns', () => {
    expect(chatUtils.extractReferencedIndices('foo [1] bar [2]')).toEqual(new Set([1, 2]));
  });

  test('extracts the number from labelled bracket patterns', () => {
    expect(chatUtils.extractReferencedIndices('see [Ref 7] for details')).toEqual(new Set([7]));
  });

  test('matches Ref labels case-insensitively', () => {
    expect(chatUtils.extractReferencedIndices('see [ref 3] and [REF 4]')).toEqual(new Set([3, 4]));
  });

  test('deduplicates repeated references', () => {
    expect(chatUtils.extractReferencedIndices('[1] [Ref 1] [1]')).toEqual(new Set([1]));
  });

  test.each([
    ['[hello]'],
    ['[]'],
    ['[1, 2]'],
    ['[1,2]'],
    ['[1 and 2]'],
    ['[hello 1]'],
    ['[Ref1]'],
  ])('ignores brackets that are not strict citations: %j', (input) => {
    expect(chatUtils.extractReferencedIndices(input)).toEqual(new Set());
  });

  test('extracts only the strict citation when mixed with non-citation brackets', () => {
    expect(chatUtils.extractReferencedIndices('see [1, 2] and [3]')).toEqual(new Set([3]));
  });

  test.each([null, undefined, ''])('returns an empty set for %j', (input) => {
    expect(chatUtils.extractReferencedIndices(input)).toEqual(new Set());
  });
});

describe('chatUtils.toReferenceLinks', () => {
  test('wraps numeric bracket patterns in anchor tags carrying data-index', () => {
    expect(chatUtils.toReferenceLinks('see [1]'))
      .toBe('see <a href="#" class="font-weight-medium" data-index="1"> [1]</a>');
  });

  test('preserves the label text inside the anchor', () => {
    expect(chatUtils.toReferenceLinks('see [Ref 2]'))
      .toBe('see <a href="#" class="font-weight-medium" data-index="2"> [Ref 2]</a>');
  });

  test.each([
    ['see [hello]'],
    ['see [1, 2]'],
    ['see [1 and 2]'],
    ['see [hello 1]'],
    ['plain text'],
  ])('leaves non-citation content untouched: %j', (input) => {
    expect(chatUtils.toReferenceLinks(input)).toBe(input);
  });

  test('only converts the strict citation when mixed with non-citation brackets', () => {
    expect(chatUtils.toReferenceLinks('see [1, 2] and [3]'))
      .toBe('see [1, 2] and <a href="#" class="font-weight-medium" data-index="3"> [3]</a>');
  });

  test.each([null, undefined, ''])('returns an empty string for %j', (input) => {
    expect(chatUtils.toReferenceLinks(input)).toBe('');
  });
});
