import { toRaw } from 'vue';

class objUtils {
  /**
   * Checks if a value is a plain object.
   *
   * A value is considered an object if it is of type 'object',
   * not null, and not an array.
   *
   * @param {Object} value - The value to check.
   * @returns {boolean} Returns true if the value is a plain object, otherwise false.
   */
  static isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Checks if an object is empty.
   *
   * An object is considered empty if it is of type 'object', not null, not an array,
   * and has no own enumerable properties.
   *
   * @param {Object} obj - The object to check.
   * @returns {boolean} Returns true if the object is empty, otherwise false.
   */
  static isEmpty(obj) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.keys(obj).length === 0;
  }

  /**
   * Converts an object or array to its raw representation.
   *
   * @param {Object|Array} object - The object or array to convert.
   * @returns {Object|Array} The raw representation of the input object or array.
   */
  static toRaw(object) {
    if (Array.isArray(object)) {
      return object.map(item => objUtils.toRaw(item));
    }
    if (object !== null && typeof object === 'object') {
      const rawObject = {};
      Object.keys(object).forEach((key) => {
        rawObject[key] = objUtils.toRaw(object[key]);
      });
      return rawObject;
    }
    return toRaw(object);
  };

  /**
   * Extracts the keys of a specified property from a nested object.
   *
   * @param {Object} params - The parameters object.
   * @param {Object} params.object - The object to extract keys from.
   * @param {string} params.property - The property to look for in the object.
   * @returns {string[]} An array of keys for the specified property.
   */
  static extractPropertyKeys({
    object,
    property,
  }) {
    if (!object || !property) return;
    const keys = [];
    const extractKeys = (obj) => {
      if (Object.hasOwn(obj, property)) {
        const props = obj.properties;
        for (const key in props) {
          if (Object.hasOwn(props, key)) {
            keys.push(key);
            extractKeys(props[key]);
          }
        }
      }
    };
    extractKeys(object);
    return keys;
  };

  /**
   * Omits null, undefined, and empty objects from the given object or array.
   *
   * @param {Object|Array} object - The object or array to process.
   * @returns {Object|Array|null} - The processed object or array with null, undefined, and empty objects omitted, or null if the result is an empty object.
   */
  static omit(object) {
    if (Array.isArray(object)) {
      return object.map(objUtils.omit).filter(value => value !== null && value !== undefined && JSON.stringify(value) !== '{}');
    }
    if (object !== null && typeof object === 'object') {
      const result = Object.fromEntries(
        Object.entries(object)
          .filter(([, value]) => value !== null && value !== undefined && JSON.stringify(value) !== '{}')
          .map(([key, value]) => [key, objUtils.omit(value)]),
      );
      return JSON.stringify(result) === '{}' ? null : result;
    }
    return object;
  }

  /**
   * Removes keys from an object based on a callback function.
   *
   * @param {Object|Array} obj - The object or array from which keys will be removed.
   * @param {Function} callback - A function that takes a key as an argument and returns true if the key should be removed.
   * @returns {Object|Array} The new object or array with the specified keys removed.
   */
  static removeKeys = (obj, callback) => {
    obj = objUtils.toRaw(obj);
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => objUtils.removeKeys(item, callback));
    }
    for (const key in obj) {
      if (callback(key)) {
        delete obj[key];
        continue;
      }
      obj[key] = objUtils.removeKeys(obj[key], callback);
    }
    return obj;
  };

  /**
   * Mutates the given object or array by applying a callback function to each key-value pair.
   *
   * @param {Object|Array} obj - The object or array to be mutated.
   * @param {Function} callback - The callback function to apply to each key-value pair.
   *                              It receives the key and value as arguments and should return the new value.
   * @returns {Object|Array} The mutated object or array.
   */
  static mutate = (obj, callback) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => objUtils.mutate(item, callback));
    }
    for (const key in obj) {
      const value = obj[key];
      const result = callback(key, value);
      if (result !== undefined) {
        obj[key] = result;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        objUtils.mutate(value, callback);
      }
    }
    return obj;
  };

  /**
   * Merges two objects deeply, combining properties from the source object into the target object.
   * If a property is an object in both the target and source, it recursively merges them.
   * If a property is not an object, the source property overwrites the target property.
   *
   * @param {Object} target - The target object to merge properties into.
   * @param {Object} source - The source object to merge properties from.
   * @returns {Object} The merged object with combined properties from both target and source.
   */
  static deepMerge(target, source) {
    if (typeof target !== 'object' || target === null) {
      return source;
    }
    if (typeof source !== 'object' || source === null) {
      return target;
    }

    // If source & target are both arrays, merge them
    if (Array.isArray(target) && Array.isArray(source)) {
      const maxLength = Math.max(target.length, source.length);
      const mergedArray = [];
      for (let i = 0; i < maxLength; i++) {
        const targetItem = target[i];
        const sourceItem = source[i];

        if (
          typeof targetItem === 'object'
          && typeof sourceItem === 'object'
          && targetItem !== null
          && sourceItem !== null
        ) {
          mergedArray[i] = objUtils.deepMerge(targetItem, sourceItem);
        } else {
          // Use sourceItem if it exists, otherwise use targetItem
          // If both are undefined, use an empty object
          mergedArray[i] = sourceItem ?? targetItem ?? {};
        }
      }

      // Collect all keys from the merged array items
      const allKeys = new Set();
      for (const item of mergedArray) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          Object.keys(item).forEach(k => allKeys.add(k));
        }
      }

      // Ensure all items in the merged array have the same keys
      for (const item of mergedArray) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          for (const key of allKeys) {
            if (!(key in item)) {
              item[key] = null;
            }
          }
        }
      }
      return mergedArray;
    }

    const merged = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (key in merged) {
        merged[key] = objUtils.deepMerge(merged[key], value);
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }

  /**
   * Fills the values of a template object using a source object.
   *
   * This method preserves the structure of the template object and
   * recursively fills its properties with corresponding values from
   * the source object, if available. If a key exists in the template
   * but not in the source, the original template value is retained.
   *
   * @param {Object|Array} template - The object or array that defines the desired structure.
   * @param {Object|Array} source - The object or array that provides values to fill into the template.
   * @returns {Object|Array} A new object or array with the same structure as the template, populated with values from the source where applicable.
   */
  static fillByTemplate(template, source, preserveKeys = []) {
    if (Array.isArray(template)) {
      if (Array.isArray(source)) {
        // If template array is empty, return a shallow copy of source array
        if (template.length === 0) return [...source];
        // Use first element as template for all array items
        const [firstTemplate] = template;
        const seen = new Set();
        return source
          .map((item) => {
            if (firstTemplate === undefined) return item;
            return objUtils.fillByTemplate(firstTemplate, item, preserveKeys);
          })
          .filter((item) => {
            const key = JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
      }
      return template;
    }

    if (template && typeof template === 'object') {
      const result = {};
      if (Object.keys(template).length === 0) return { ...source };
      for (const key of Object.keys(template)) {
        const templateVal = template[key];
        if (preserveKeys.includes(key)) {
          result[key] = templateVal;
          continue;
        }
        const sourceVal = source?.[key];

        result[key]
          = typeof templateVal === 'object' && templateVal !== null
            ? objUtils.fillByTemplate(templateVal, sourceVal, preserveKeys)
            : sourceVal === undefined ? templateVal : sourceVal;
      }
      return result;
    }

    return template;
  }

  /**
   * Returns a new object with a value set at the specified JSONPath string.
   *
   * If the path is invalid or does not start with `$`, the original object is returned unchanged.
   * Intermediate objects along the path will be created if they do not exist.
   *
   * Wildcard JSONPath, e.g. $.[*], $.[*][*] and Step Functions context object or intrinsic functions are not supported.
   *
   * @param {Object} obj - The target object.
   * @param {string} jsonPath - The JSONPath string (e.g., '$.a.b.c') representing the location to set the value.
   * @param {*} value - The value to assign at the specified path.
   * @returns {Object} A new object with the updated value.
   */
  static setValueByJsonPath(obj, jsonPath, value) {
    if (typeof jsonPath !== 'string' || !jsonPathUtils.isJsonPath(jsonPath)) {
      return obj;
    }

    const keys = jsonPath === '$' ? [] : jsonPath.replace(/^\$\./, '').split('.');
    if (keys.length === 0) return value;

    const result = { ...obj };
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!Object.hasOwn(current, key) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  /**
   * Parses numeric strings to numbers and boolean strings to booleans in an object or array.
   *
   * @param {Object|Array|*} obj - The object, array, or value to process.
   * @returns {Object|Array|*} The processed object/array with converted values.
   */
  static parseStringLiteral(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => objUtils.parseStringLiteral(item));
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = objUtils.parseStringLiteral(value);
      }
      return result;
    }

    if (typeof obj === 'string') {
      // Check for JSON strings
      if (jsonUtils.isValid(obj)) {
        return jsonUtils.safeParse(obj);
      }
      // Check for boolean strings
      if (obj.toLowerCase() === 'true') return true;
      if (obj.toLowerCase() === 'false') return false;
      // Check for numeric strings
      if (obj.trim() !== '' && !isNaN(obj) && !isNaN(parseFloat(obj))) {
        // Check if it's an integer
        if (Number.isInteger(parseFloat(obj)) && obj.indexOf('.') === -1) {
          return parseInt(obj, 10);
        }
        // Otherwise it's a float
        return parseFloat(obj);
      }
    }

    return obj;
  }

  /**
   * Returns all values found at the given path in an object.
   * Supports "[]" to expand arrays at that segment.
   * Example: "parameters.payload.retrievers[].retrieverType"
   *
   * @param {Object} obj
   * @param {string} path
   * @returns {any[]} possibly empty array
   */
  static getValuesAtPath(obj, path) {
    if (!obj) return [];
    const segments = path.split('.');

    const dfs = (node, i) => {
      if (node == null) return [];
      if (i === segments.length) return [node];

      const seg = segments[i];
      const isArraySeg = seg.endsWith('[]');
      const key = isArraySeg ? seg.slice(0, -2) : seg;

      const next = node?.[key];
      if (isArraySeg) {
        if (!Array.isArray(next)) return [];
        // Flatten: recurse over each element
        let acc = [];
        for (const item of next) {
          acc = acc.concat(dfs(item, i + 1));
        }
        return acc;
      } else {
        return dfs(next, i + 1);
      }
    };

    return dfs(obj, 0);
  }

  /**
   * Finds the first value by key name in a nested object/array.
   *
   * @param {Object|Array} obj - The object or array to search.
   * @param {string} targetKey - The key name to match.
   * @returns {*} The first matched value, or undefined if not found.
   */
  static getFirstValueByKey(obj, targetKey) {
    if (obj == null) return undefined;

    const seen = new WeakSet();

    const dfs = (node) => {
      if (node == null) return undefined;
      const isObj = typeof node === 'object';
      if (!isObj) return undefined;

      if (seen.has(node)) return undefined;
      seen.add(node);

      if (!Array.isArray(node) && Object.prototype.hasOwnProperty.call(node, targetKey)) {
        return node[targetKey];
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = dfs(item);
          if (found !== undefined) return found;
        }
      } else {
        for (const key of Object.keys(node)) {
          const found = dfs(node[key]);
          if (found !== undefined) return found;
        }
      }

      return undefined;
    };

    return dfs(obj);
  }

  /**
   * Creates a shallow clone of an object while preserving its prototype.
   *
   * This is useful when cloning class instances or objects that rely on
   * prototype methods, getters, or instanceof checks.
   *
   * @param {Object} source - The object to clone.
   * @returns {Object} A new object with the same prototype and own properties.
   */
  static cloneWithPrototype = (source) => {
    if (source == null || typeof source !== 'object') return source;

    return Object.create(
      Object.getPrototypeOf(source),
      Object.getOwnPropertyDescriptors(source),
    );
  };
}

export default objUtils;
