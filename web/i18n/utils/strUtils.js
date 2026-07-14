class strUtils {
  /**
   * Converts a given string into an interpolated literal format.
   *
   * This function takes a string and returns it wrapped in curly braces and single quotes,
   * which can be useful for certain templating or localization scenarios.
   *
   * @param {string} str - The string to be converted into an interpolated literal.
   * @returns {string} The interpolated literal string.
   * @see https://vue-i18n.intlify.dev/guide/essentials/syntax#literal-interpolation
   */
  static toInterpolatedLiteral(str) {
    return `{'${str}'}`;
  }
}

export default strUtils;
