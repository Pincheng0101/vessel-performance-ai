class pathUtils {
  /**
   * Extracts the substring after the last occurrence of the specified separator.
   *
   * @param {string} text - The input string.
   * @param {string} separator - The separator to search for.
   * @returns {string} The substring after the last occurrence of the separator, or the original string if the separator is not found.
   */
  static extractLast(text, separator = '/') {
    const normalized = text.endsWith(separator) ? text.slice(0, -separator.length) : text;
    return normalized.includes(separator) ? normalized.split(separator).pop() : normalized;
  }

  /**
   * Extracts the directory portion of a given path based on the specified separator.
   * @param {string} path - The full path string.
   * @param {string} separator - The separator to use (default is '/').
   * @returns {string} The substring from the beginning up to and including the last separator. If the separator is not found, returns the original path.
   */
  static extractDirectory(path, separator) {
    const index = path.lastIndexOf(separator);
    return path.slice(0, index >= 0 ? index + 1 : '');
  }

  /**
   * Gets the lowercased file extension from a path, including the leading dot.
   *
   * @param {string} path - The file path or filename.
   * @returns {string} The file extension, or empty string if none exists.
   */
  static getFileExtension(path) {
    const fileName = pathUtils.extractLast(path || '');
    const extensionIndex = fileName.lastIndexOf('.');
    if (extensionIndex === -1) return '';
    return fileName.slice(extensionIndex).toLowerCase();
  }

  /**
   * Appends a trailing forward slash to the given string if it does not already end with one.
   *
   * @param {string} text - The input string.
   * @returns {string} The string with a trailing forward slash.
   */
  static appendTrailingSlash(text) {
    if (!text) return '';
    return text.endsWith('/') ? text : `${text}/`;
  }
}

export default pathUtils;
