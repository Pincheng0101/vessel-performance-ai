import { describe, expect, test } from 'vitest';
import conditionUtils from './conditionUtils';

const ITEM = { age: 25, name: 'John', active: true };

describe('conditionUtils.evaluate', () => {
  test.each([
    [{ field: 'age', operator: '==', value: 25 }, true],
    [{ field: 'age', operator: '==', value: 24 }, false],
    [{ field: 'age', operator: '!=', value: 24 }, true],
    [{ field: 'age', operator: '>', value: 18 }, true],
    [{ field: 'age', operator: '<', value: 18 }, false],
    [{ field: 'age', operator: '>=', value: 25 }, true],
    [{ field: 'age', operator: '<=', value: 25 }, true],
  ])('evaluates leaf condition %j as %j', (condition, expected) => {
    expect(conditionUtils.evaluate(ITEM, condition)).toBe(expected);
  });

  test('returns false for unknown operator', () => {
    expect(conditionUtils.evaluate(ITEM, { field: 'age', operator: '~', value: 25 })).toBe(false);
  });

  test('AND returns true only when every sub-condition is true', () => {
    const condition = {
      logic: 'AND',
      conditions: [
        { field: 'age', operator: '>=', value: 18 },
        { field: 'active', operator: '==', value: true },
      ],
    };
    expect(conditionUtils.evaluate(ITEM, condition)).toBe(true);
  });

  test('AND returns false when any sub-condition fails', () => {
    const condition = {
      logic: 'AND',
      conditions: [
        { field: 'age', operator: '>=', value: 18 },
        { field: 'name', operator: '==', value: 'Alice' },
      ],
    };
    expect(conditionUtils.evaluate(ITEM, condition)).toBe(false);
  });

  test('OR returns true when at least one sub-condition matches', () => {
    const condition = {
      logic: 'OR',
      conditions: [
        { field: 'name', operator: '==', value: 'Alice' },
        { field: 'active', operator: '==', value: true },
      ],
    };
    expect(conditionUtils.evaluate(ITEM, condition)).toBe(true);
  });

  test('evaluates nested AND/OR groups', () => {
    const condition = {
      logic: 'AND',
      conditions: [
        { field: 'age', operator: '>=', value: 18 },
        {
          logic: 'OR',
          conditions: [
            { field: 'name', operator: '==', value: 'Alice' },
            { field: 'active', operator: '==', value: true },
          ],
        },
      ],
    };
    expect(conditionUtils.evaluate(ITEM, condition)).toBe(true);
  });

  test('invokes a function operator with (itemValue, value, item)', () => {
    const calls = [];
    const operator = (itemValue, value, item) => {
      calls.push({ itemValue, value, item });
      return itemValue === 25;
    };
    const result = conditionUtils.evaluate(ITEM, { field: 'age', operator, value: 99 });
    expect(result).toBe(true);
    expect(calls).toEqual([{ itemValue: 25, value: 99, item: ITEM }]);
  });
});
