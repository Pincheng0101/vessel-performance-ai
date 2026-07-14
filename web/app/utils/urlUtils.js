class urlUtils {
  /**
   * Converts a URL/path to an absolute URL.
   *
   * @param {string} path
   * @returns {string}
   */
  static toAbsolute(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (typeof window === 'undefined') {
      return normalizedPath;
    }
    return new URL(normalizedPath, window.location.origin).toString();
  }
}

export default urlUtils;
