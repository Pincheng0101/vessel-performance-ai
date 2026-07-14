import { describe, expect, test } from 'vitest';
import randomUtils from './randomUtils';

describe('randomUtils.secureInt', () => {
  test('returns an integer within [0, max)', () => {
    for (let i = 0; i < 100; i++) {
      const value = randomUtils.secureInt(10);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  test('returns 0 when max is 1', () => {
    expect(randomUtils.secureInt(1)).toBe(0);
  });

  test.each([
    [0],
    [-5],
    [2.5],
    [NaN],
    [undefined],
  ])('returns 0 for non-positive-integer max %j', (max) => {
    expect(randomUtils.secureInt(max)).toBe(0);
  });

  test('produces a roughly uniform distribution across the range', () => {
    const max = 4;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) counts[randomUtils.secureInt(max)]++;
    counts.forEach(count => expect(count).toBeGreaterThan(700));
  });
});
