class referencePathUtils {
  /**
   * Checks if the given string is exactly '$' or starts with '$.'.
   *
   * @param {string} str - The string to check for the prefix.
   * @returns {boolean} Returns true if the string is '$' or starts with '$.', otherwise false.
   */
  static hasDollarPrefix(str) {
    return str === '$' || String(str).startsWith('$.');
  }

  /**
   * Checks if the given string ends with the suffix '.$'.
   *
   * @param {string} str - The string to check.
   * @returns {boolean} True if the string ends with '.$', otherwise false.
   */
  static hasDollarSuffix(str) {
    return String(str).endsWith('.$');
  }

  /**
   * Checks if the given string ends with the suffix '.%'.
   * @param {*} str
   * @returns
   */
  static hasPercentSuffix(str) {
    return String(str).endsWith('.%');
  }

  /**
   * Recursively finds invalid JSONPath bindings in an object based on key and value rules.
   * Specifically checks for keys ending with '.$' and whether values are valid JSONPath expressions,
   * as well as handling special cases for external memory jsonpath keys.
   *
   * @param {Object} object - The object to search for JSONPath bindings.
   * @param {string[]|number[]} [path=[]] - The current path within the object, used for error reporting.
   * @returns {Object[]} An array of error objects, each containing:
   *   - {string} type - The type of error ('key' or 'value').
   *   - {string} key - The key where the error was found.
   *   - {string} value - The value associated with the key.
   *   - {string[]|number[]} path - The path to the error within the object.
   */
  static findInvalidJsonPathBindings(object, path = []) {
    const errors = [];
    if (!object || typeof object !== 'object') {
      return errors;
    }
    if (Array.isArray(object)) {
      for (let i = 0; i < object.length; i++) {
        if (object[i] && typeof object[i] === 'object') {
          errors.push(...referencePathUtils.findInvalidJsonPathBindings(object[i], [...path, String(i)]));
        }
      }
      return errors;
    }
    for (const key in object) {
      if (Object.hasOwn(object, key)) {
        const value = object[key];
        const currentPath = [...path, key];
        if (typeof value === 'object' && value !== null) {
          errors.push(...referencePathUtils.findInvalidJsonPathBindings(value, currentPath));
        }
        if (typeof value === 'string') {
          const hasDollarSuffix = referencePathUtils.hasDollarSuffix(key);
          const isSpecialKey = key === 'jsonpath';
          const isJsonPath = jsonPathUtils.isJsonPath(value);
          if (!hasDollarSuffix && !isSpecialKey && isJsonPath) {
            errors.push({ type: 'key', key, value, path: currentPath });
          }
          if ((hasDollarSuffix || isSpecialKey) && !isJsonPath) {
            errors.push({ type: 'value', key, value, path: currentPath });
          }
        }
      }
    }
    return errors;
  }
}

export default referencePathUtils;
