import { describe, expect, test } from 'vitest';
import colorUtils from './colorUtils';

const HEX_PATTERN = /^#[0-9A-F]{6}$/;

const channelsOf = hex => hex.slice(1).match(/.{2}/g).map(c => parseInt(c, 16));

describe('colorUtils.textToColorCode', () => {
  test('returns an uppercase 6-digit hex code', () => {
    expect(colorUtils.textToColorCode('hello')).toMatch(HEX_PATTERN);
  });

  test('is deterministic for the same input and seed', () => {
    expect(colorUtils.textToColorCode('hello')).toBe(colorUtils.textToColorCode('hello'));
  });

  test('produces different output when seed changes', () => {
    expect(colorUtils.textToColorCode('hello', 1))
      .not.toBe(colorUtils.textToColorCode('hello', 2));
  });

  test.each(['a', 'hello world', '中文', ''])(
    'clamps every channel of %j into the [80, 200] range',
    (input) => {
      const [r, g, b] = channelsOf(colorUtils.textToColorCode(input));
      expect([r, g, b].every(c => c >= 80 && c <= 200)).toBe(true);
    },
  );
});

describe('colorUtils.computeTextColor', () => {
  test.each([
    ['#FFFFFF', 'black'],
    ['#FFFF00', 'black'],
    ['#808080', 'white'],
    ['#000000', 'white'],
    ['#0000FF', 'white'],
  ])('returns %s as the text color for background %s', (hex, expected) => {
    expect(colorUtils.computeTextColor(hex)).toBe(expected);
  });

  test('accepts a hex string without the leading #', () => {
    expect(colorUtils.computeTextColor('FFFFFF')).toBe('black');
  });
});
