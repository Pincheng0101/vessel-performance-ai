class conditionUtils {
  /**
   * Evaluates a condition object against an item object.
   *
   * @param {Object} item
   * @param {Object} condition
   * @returns {boolean}
   *
   * @example
   * const item = {
   *   age: 25,
   *   name: 'John',
   *   active: true,
   * };
   *
   * const condition = {
   *   logic: 'AND',
   *   conditions: [
   *     { field: 'age', operator: '>=', value: 18 },
   *     {
   *       logic: 'OR',
   *       conditions: [
   *         { field: 'name', operator: '==', value: 'John' },
   *         { field: 'active', operator: '==', value: true },
   *       ],
   *     },
   *   ],
   * };
   *
   * const result = conditionUtils.evaluate(item, condition);
   * console.log(result); // Output: true
   */
  static evaluate(item, condition) {
    if (condition.conditions) {
      return condition.logic === 'AND'
        ? condition.conditions.every(subCondition => conditionUtils.evaluate(item, subCondition))
        : condition.conditions.some(subCondition => conditionUtils.evaluate(item, subCondition));
    }

    const itemValue = item[condition.field];

    if (typeof condition.operator === 'function') {
      return condition.operator(itemValue, condition.value, item);
    }

    switch (condition.operator) {
      case '!=': return itemValue !== condition.value;
      case '==': return itemValue === condition.value;
      case '>': return itemValue > condition.value;
      case '<': return itemValue < condition.value;
      case '>=': return itemValue >= condition.value;
      case '<=': return itemValue <= condition.value;
      default: return false;
    }
  }
}

export default conditionUtils;
