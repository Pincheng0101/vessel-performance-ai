import { Type as ExternalMemoryType } from '~/constants/ExternalMemoryConstant';

const RESERVED_SELECTORS = Object.freeze({
  OUTPUT: 'output_selector',
  STATE_MEMORY_INPUT: 'state_memory_input_selector',
  STATE_MEMORY_OUTPUT: 'state_memory_output_selector',
});

class referencePathUtils {
  /**
   * Determines if the provided value represents a valid reference path.
   *
   * A reference path is considered valid if it is either a JSONPath string
   * or an external memory object.
   *
   * @param {string|Object} value - The value to evaluate.
   * @returns {boolean} True if the value is a reference path, otherwise false.
   */
  static isReferencePath(value) {
    return jsonPathUtils.isJsonPath(value) || referencePathUtils.isExternalMemoryObject(value);
  }

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
   * Adds a prefix ($.foo) to the given string.
   * If the variable is in suffix form (foo.$), converts it to prefix.
   *
   * @param {string} str - The string to convert to prefix format
   * @returns {string} The string in prefix format ($.foo)
   */
  static toDollarPrefix(str) {
    if (str === '$') return str;
    if (referencePathUtils.hasDollarSuffix(str)) {
      return `$.${String(str).slice(0, -2)}`;
    }
    return `$.${str}`;
  }

  /**
   * Adds a suffix (foo.$) to the given string.
   * If the variable is in prefix form ($.foo), converts it to suffix.
   *
   * @param {string} str - The string to convert to suffix format
   * @returns {string} The string in suffix format (foo.$)
   */
  static toDollarSuffix(str) {
    if (str === '$') return str;
    if (referencePathUtils.hasDollarPrefix(str)) {
      return `${String(str).slice(2)}.$`;
    }
    return `${str}.$`;
  }

  /**
   * Determines if the provided value is an external memory object.
   *
   * Checks if the value is an object, contains a 'type' property,
   * and if its 'type' matches any value in the ExternalMemoryType enum.
   *
   * @param {*} obj - The value to check.
   * @returns {boolean} True if the value is an external memory object, otherwise false.
   */
  static isExternalMemoryObject(obj) {
    return objUtils.isObject(obj) && 'type' in obj && Object.values(ExternalMemoryType).some(t => t.value === obj.type);
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

  /**
   * Adds `.$` and `.%` suffixes to keys in an object, including nested objects and arrays.
   *
   * This function traverses objects recursively and annotates keys based on their values:
   * - Appends `.$` to keys whose values are JSONPath expressions.
   * - Appends `.%` to keys whose values represent external memory objects.
   * - Carries the `.%` state of a parent key down to its children to determine whether JSONPath keys should receive the `.$` suffix.
   *
   * @param {Object} object - The input object whose keys may need `.$` or `.%` suffixes.
   * @returns {Object} A new object with the same values but with keys updated to include the appropriate `.$` or `.%` suffixes.
   */
  static addSuffixes(object) {
    const processObject = (obj) => {
      if (obj === null) return null;
      if (Array.isArray(obj)) {
        return obj.map(processObject);
      }
      if (typeof obj === 'object') {
        const result = {};
        for (let key in obj) {
          const value = obj[key];
          if ((key === RESERVED_SELECTORS.STATE_MEMORY_INPUT) || (key === RESERVED_SELECTORS.STATE_MEMORY_OUTPUT) || (key === RESERVED_SELECTORS.OUTPUT && !jsonPathUtils.isJsonPath(value))) {
            result[key] = obj[key];
            continue;
          }
          if (!Object.hasOwn(obj, key)) continue;
          // If the value is an external memory object and the key does not already end with '.%', append the suffix
          if (referencePathUtils.isExternalMemoryObject(value) && !key.endsWith('.%')) {
            key = `${key}.%`;
          }
          // If the value is a JSONPath and the key does not already end with '.$', append the suffix
          if (jsonPathUtils.isJsonPath(value) && key !== 'jsonpath' && !key.endsWith('.$')) {
            key = `${key}.$`;
          }
          // Pass down information about whether the current key ends with .% to child levels
          result[key] = processObject(value, key.endsWith('.%'));
        }
        return result;
      }
      return obj;
    };
    return processObject(object);
  }

  /**
   * Removes `.$` and `.%` suffixes from keys in an object, including nested objects and arrays.
   *
   * This function traverses objects recursively and normalizes keys by removing suffix markers:
   * - Strips `.$` from keys used for JSONPath expressions.
   * - Strips `.%` from keys associated with external memory objects.
   * - Maintains the original structure and values while cleaning key names across all levels.
   *
   * @param {Object} object - The input object whose keys may contain `.$` or `.%` suffixes.
   * @returns {Object} A new object with the same values but with keys cleaned of `.$` and `.%` suffixes.
   */
  static removeSuffixes(object) {
    const processObject = (obj) => {
      if (obj === null) return null;
      if (Array.isArray(obj)) {
        return obj.map(processObject);
      }
      if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          if (!Object.hasOwn(obj, key)) continue;
          const value = obj[key];
          // If the value is an external memory object and the key ends with '.%', remove the suffix
          if (referencePathUtils.isExternalMemoryObject(value)) {
            const newKey = key.endsWith('.%') ? key.slice(0, -2) : key;
            result[newKey] = obj[key];
            continue;
          }
          // If the value is a JSONPath and the key ends with '.$', remove the suffix
          if (jsonPathUtils.isJsonPath(value) && key !== 'jsonpath' && key.endsWith('.$')) {
            const newKey = key.slice(0, -2);
            result[newKey] = obj[key];
            continue;
          }
          result[key] = processObject(value);
        }
        return result;
      }
      return obj;
    };
    return processObject(object);
  }
}

export default referencePathUtils;
