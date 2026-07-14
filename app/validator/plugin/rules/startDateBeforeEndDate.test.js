import { describe, expect, test } from 'vitest';
import startDateBeforeEndDate from './startDateBeforeEndDate';

describe('startDateBeforeEndDate', () => {
  test('should pass when start date is on or before the end date', () => {
    expect(startDateBeforeEndDate('2024-06-01')('2024-01-01')).toBe(true);
    expect(startDateBeforeEndDate('2024-01-01')('2024-01-01')).toBe(true);
    expect(startDateBeforeEndDate(new Date('2024-06-01'))(new Date('2024-01-01'))).toBe(true);
  });
  test('should pass when either date is empty', () => {
    expect(startDateBeforeEndDate('')('2024-01-01')).toBe(true);
    expect(startDateBeforeEndDate('2024-01-01')('')).toBe(true);
    expect(startDateBeforeEndDate(null)(null)).toBe(true);
  });
  test('should fail when start date is after the end date', () => {
    expect(startDateBeforeEndDate('2024-01-01')('2024-06-01')).toBe(false);
    expect(startDateBeforeEndDate(new Date('2024-01-01'))(new Date('2024-06-01'))).toBe(false);
  });
});
