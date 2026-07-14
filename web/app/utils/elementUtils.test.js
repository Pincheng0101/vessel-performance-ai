// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import elementUtils from './elementUtils';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('elementUtils.getMarkerByUrl', () => {
  test('returns the element referenced by the given url(#id) string', () => {
    const el = document.createElement('div');
    el.id = 'marker';
    document.body.appendChild(el);
    expect(elementUtils.getMarkerByUrl('url(\'#marker\')')).toBe(el);
  });

  test('returns undefined when the input does not start with url(', () => {
    expect(elementUtils.getMarkerByUrl('plain')).toBeUndefined();
  });

  test('returns undefined when the marker id does not start with #', () => {
    expect(elementUtils.getMarkerByUrl('url(\'marker\')')).toBeUndefined();
  });
});

describe('elementUtils.getWidth', () => {
  test('returns the bounding rect width of the element', () => {
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 120, height: 0 });
    expect(elementUtils.getWidth(el)).toBe(120);
  });

  test('returns 0 when the bounding rect has no width', () => {
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 0, height: 0 });
    expect(elementUtils.getWidth(el)).toBe(0);
  });
});

describe('elementUtils.getHeight', () => {
  test('returns the bounding rect height of the element', () => {
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 0, height: 75 });
    expect(elementUtils.getHeight(el)).toBe(75);
  });
});

describe('elementUtils.getMarginTop', () => {
  test('parses the computed marginTop as a number', () => {
    const el = document.createElement('div');
    el.style.marginTop = '12px';
    document.body.appendChild(el);
    expect(elementUtils.getMarginTop(el)).toBe(12);
  });

  test('returns 0 when marginTop is not numeric', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(elementUtils.getMarginTop(el)).toBe(0);
  });
});

describe('elementUtils.getMarginBottom', () => {
  test('parses the computed marginBottom as a number', () => {
    const el = document.createElement('div');
    el.style.marginBottom = '8px';
    document.body.appendChild(el);
    expect(elementUtils.getMarginBottom(el)).toBe(8);
  });
});
