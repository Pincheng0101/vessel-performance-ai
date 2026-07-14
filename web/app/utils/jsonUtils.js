class jsonUtils {
  /**
   * Safely parses a JSON string.
   *
   * @param {string} str - The JSON string to parse.
   * @returns {Object|null} The parsed object if the string is valid JSON, otherwise null.
   */
  static safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  /**
   * Safely converts an object to a JSON string.
   * If the object is null, it returns an empty string.
   * If an error occurs during stringification, it catches the error and returns an empty string.
   *
   * @param {Object} obj - The object to be stringified.
   * @returns {string} The JSON string representation of the object, or an empty string if the object is null or an error occurs.
   */
  static safeStringify(obj) {
    if (obj === null) return '';
    try {
      return JSON.stringify(obj);
    } catch {
      return '';
    }
  }

  /**
   * Safely beautifies a JSON string or object.
   * If the input is a JSON string, it attempts to parse it into an object.
   * If parsing fails, it returns the original string.
   * If the input is already an object, it returns a pretty-printed JSON string.
   *
   * @param {string|object} v - The JSON string or object to beautify.
   * @returns {string} The beautified JSON string.
   */
  static safeBeautify(v) {
    if (typeof v === 'string') {
      const obj = jsonUtils.safeParse(v);
      if (obj === null) {
        return v;
      }
      v = obj;
    }
    return JSON.stringify(v, null, 2);
  }

  /**
   * Checks if a given string is a valid JSON.
   *
   * @param {string} str - The string to be validated as JSON.
   * @returns {boolean} Returns true if the string is a valid JSON, otherwise false.
   */
  static isValid(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a given string is a valid JSON object.
   *
   * @param {string} str - The string to be checked.
   * @returns {boolean} Returns true if the string is a valid JSON object, otherwise false.
   */
  static isObject(str) {
    try {
      const result = JSON.parse(str);
      return typeof result === 'object' && result !== null;
    } catch {
      return false;
    }
  }
}

export default jsonUtils;
