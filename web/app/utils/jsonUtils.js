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
}

export default jsonUtils;
