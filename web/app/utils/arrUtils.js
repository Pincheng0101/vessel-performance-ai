class arrUtils {
  /**
   * Casts the given value to an array. If the value is already an array, it is returned as is.
   * Otherwise, the value is wrapped in an array.
   *
   * @param {*} value - The value to be cast to an array.
   * @returns {Array} The value cast to an array.
   */
  static cast(value) {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Checks if the given value is an empty array.
   *
   * @param {any} value - The value to check.
   * @returns {boolean} Returns `true` if the value is an empty array, otherwise `false`.
   */
  static isEmpty(value) {
    return Array.isArray(value) && value.length === 0;
  }

  /**
   * Checks if the given value is an array of strings.
   *
   * @param {any} value - The value to check.
   * @returns {boolean} Returns `true` if the value is an array where all elements are strings, otherwise `false`.
   */
  static isArrayOfString(value) {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
  }

  /**
   * Deduplicates an array by removing duplicate values.
   *
   * @param {Array} value - The array to deduplicate.
   * @returns {Array} A new array with duplicate values removed. If the input is not an array, returns an empty array.
   */
  static deduplicate(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)];
  }

  /**
   * Deduplicates an array of objects based on a specified key.
   *
   * @param {Array} value - The array of objects to deduplicate.
   * @param {string} [key='id'] - The property key to use for deduplication.
   * @returns {Array} A new array with duplicate values (based on the given key) removed.
   */
  static deduplicateByKey(value, key = 'id') {
    if (!Array.isArray(value)) return [];
    return [...new Map(value.map(item => [item?.[key], item])).values()];
  }

  /**
   * Compares two arrays to determine if they contain the same elements, regardless of order.
   *
   * @param {Array} value1 - The first array to compare.
   * @param {Array} value2 - The second array to compare.
   * @returns {boolean} Returns `true` if both arrays contain the same elements in any order, otherwise `false`.
   */
  static isEqualUnordered(value1, value2) {
    if (value1.length !== value2.length) {
      return false;
    }
    const sorted1 = [...value1].sort();
    const sorted2 = [...value2].sort();
    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i] !== sorted2[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Compares two arrays and checks whether they contain the same values in the same order.
   *
   * @param {Array} value1 - The first array to compare.
   * @param {Array} value2 - The second array to compare.
   * @returns {boolean} Returns `true` if both arrays are equal in length, values, and order.
   */
  static isEqualOrdered(value1, value2) {
    return value1.length === value2.length && value1.every((item, index) => item === value2[index]);
  }

  /**
   * Compares two arrays of objects and identifies added, removed, and changed objects based on a specified key and a diff callback.
   *
   * @param {Object[]} currentValue - The original array of objects.
   * @param {Object[]} updatedValue - The updated array of objects.
   * @param {Object} options - Options for comparison.
   * @param {string} [options.key='id'] - The key used to identify objects in the arrays.
   * @param {Function} [options.isChanged] - A function to determine if two objects are considered different.
   *                                         Defaults to comparing their JSON string representations.
   * @returns {Object} An object containing the differences:
   *                   - `added` {Object[]} - Objects present in `updatedValue` but not in `currentValue`.
   *                   - `removed` {Object[]} - Objects present in `currentValue` but not in `updatedValue`.
   *                   - `changed` {Object[]} - Objects with the same key but different values, including the key,
   *                     original object (`from`), and updated object (`to`).
   */
  static diffObjectByKey(
    currentValue,
    updatedValue,
    {
      key = 'id',
      isChanged = (a, b) => JSON.stringify(a) !== JSON.stringify(b),
    },
  ) {
    const currentMap = new Map(currentValue.map(item => [item[key], item]));
    const updatedMap = new Map(updatedValue.map(item => [item[key], item]));

    const added = [];
    const removed = [];
    const changed = [];

    for (const [keyValue, updatedItem] of updatedMap.entries()) {
      const currentItem = currentMap.get(keyValue);
      if (!currentItem) {
        added.push(updatedItem);
      } else if (isChanged(currentItem, updatedItem)) {
        changed.push({ [key]: keyValue, from: currentItem, to: updatedItem });
      }
    }

    for (const [keyValue, currentItem] of currentMap.entries()) {
      if (!updatedMap.has(keyValue)) {
        removed.push(currentItem);
      }
    }

    return { added, removed, changed };
  }

  /**
   * Returns a new array with the input's elements in random order
   * (Fisher-Yates shuffle).
   *
   * @param {Array} value - The array to shuffle.
   * @returns {Array} A new shuffled array. Returns an empty array if the input is not an array.
   */
  static shuffle(value) {
    if (!Array.isArray(value)) return [];
    const result = [...value];
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomUtils.secureInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Walk through array of object and extract values by paths.
   * Path syntax supports "a.b.c" and "arr[].field" (array expansion).
   *
   * @param {Object[]} value
   * @param {string[]} paths paths to collect (each may include "[]")
   * @returns {any[]}
   */
  static collectValues(value, paths) {
    if (!value || !Array.isArray(value)) return [];
    const collected = new Set();

    for (const item of value) {
      for (const path of paths) {
        objUtils.getValuesAtPath(item, path).forEach((v) => {
          if (v !== undefined && v !== null) {
            collected.add(v);
          }
        });
      }
    }
    return Array.from(collected);
  }
}

export default arrUtils;
