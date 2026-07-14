import { describe, expect, test } from 'vitest';
import endDateAfterStartDate from './endDateAfterStartDate';

describe('endDateAfterStartDate', () => {
  test('should pass when end date is on or after the start date', () => {
    expect(endDateAfterStartDate('2024-01-01')('2024-01-02')).toBe(true);
    expect(endDateAfterStartDate('2024-01-01')('2024-01-01')).toBe(true);
    expect(endDateAfterStartDate(new Date('2024-01-01'))(new Date('2024-06-01'))).toBe(true);
  });
  test('should pass when either date is empty', () => {
    expect(endDateAfterStartDate('')('2024-01-01')).toBe(true);
    expect(endDateAfterStartDate('2024-01-01')('')).toBe(true);
    expect(endDateAfterStartDate(null)(null)).toBe(true);
  });
  test('should fail when end date is before the start date', () => {
    expect(endDateAfterStartDate('2024-06-01')('2024-01-01')).toBe(false);
    expect(endDateAfterStartDate(new Date('2024-06-01'))(new Date('2024-01-01'))).toBe(false);
  });
});
