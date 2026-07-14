class htmlUtils {
  /**
   * Escapes special HTML characters in a string to their corresponding HTML entities.
   *
   * @param {string} str - The string to escape.
   * @returns {string} The escaped string safe for HTML insertion.
   */
  static escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Unescapes HTML entities in a string back to their original characters.
   * Handles all named (e.g. `&amp;`, `&nbsp;`) and numeric (e.g. `&#39;`,
   * `&#x27;`) entity references by delegating to the browser's HTML parser.
   *
   * @param {string} str - The string to unescape.
   * @returns {string} The unescaped original string.
   */
  static unescape(str) {
    if (typeof str !== 'string' || !str.includes('&')) return str;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }

  /**
   * Recursively unescapes HTML entities in any string values found inside the
   * given value. Strings are unescaped; arrays and plain objects are walked;
   * other values are returned as-is.
   *
   * @param {*} value - The value to traverse.
   * @returns {*} A new value with all nested strings unescaped.
   */
  static unescapeDeep(value) {
    if (typeof value === 'string') return this.unescape(value);
    if (Array.isArray(value)) return value.map(item => this.unescapeDeep(item));
    if (value && typeof value === 'object' && value.constructor === Object) {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [key, this.unescapeDeep(val)]),
      );
    }
    return value;
  }
}

export default htmlUtils;
