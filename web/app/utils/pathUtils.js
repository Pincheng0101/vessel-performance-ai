class pathUtils {
  /**
   * Extracts the substring after the first occurrence of the specified separator.
   *
   * @param {string} text - The input string.
   * @param {string} separator - The separator to search for.
   * @returns {string} The substring after the first occurrence of the separator, or an empty string if the separator is not found.
   */
  static extractAfter(text, separator) {
    const parts = text.split(separator);
    return parts.length > 1 ? parts[1] : '';
  }

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

  /**
 * Removes the trailing forward slash from the given string, if it exists.
 *
 * @param {string} text - The input string.
 * @returns {string} The string without a trailing forward slash.
 */
  static removeTrailingSlash(text) {
    if (!text) return '';
    return text.endsWith('/') ? text.slice(0, -1) : text;
  }

  /**
   * Removes the last path segment from a given path.
   * @param {string} path - The input path string.
   * @returns {string} The path with the last segment removed, or empty string if no segments remain.
   */
  static removeLastSegment(path) {
    if (!path) return '';
    const normalized = path.endsWith('/') ? path.slice(0, -1) : path;
    const result = pathUtils.extractDirectory(normalized, '/');
    return result === normalized ? '' : result;
  }

  /**
   * Checks if one path is a parent path of another path.
   * If both paths are the same, returns true.
   *
   * @param {string} parentPath - The potential parent path.
   * @param {string} childPath - The potential child path.
   * @returns {boolean} True if parentPath is a parent of childPath or if they are the same, false otherwise.
   */
  static isParentOf(parentPath, childPath) {
    const normalizedParent = pathUtils.appendTrailingSlash(parentPath);
    const normalizedChild = pathUtils.appendTrailingSlash(childPath);
    if (normalizedParent === normalizedChild) return true;
    return normalizedChild.startsWith(normalizedParent);
  }

  /**
   * Extracts the top-level root paths by removing nested child roots.
   * e.g. ["a/", "a/b/", "c/"] -> ["a/", "c/"]
   *
   * @param {string[]} paths - The list of prefix paths.
   * @returns {string[]} The collapsed list of non-overlapping root paths.
   */
  static extractRoots(paths) {
    if (!Array.isArray(paths)) return [];
    const uniquePrefixes = Array.from(new Set(paths));
    uniquePrefixes.sort((a, b) => a.length - b.length);
    const rootPrefixes = [];
    for (const prefix of uniquePrefixes) {
      if (!rootPrefixes.some(root => prefix.startsWith(root))) rootPrefixes.push(prefix);
    }
    return rootPrefixes;
  }

  /**
   * Extract all folder prefixes (ending with "/") from a flat list of objects.
   * Works by inferring folders from each object's parent path segments.
   *
   * @param {{objectPath: string}[]} items
   * @returns {string[]} Unique, sorted list of folder prefixes.
   */
  static extractAllFolders(items) {
    const folders = new Set();
    for (const item of items) {
      if (!item.objectPath) continue;
      const parts = item.objectPath.split('/').filter(Boolean);
      for (let i = 0; i < parts.length - 1; i++) {
        const prefix = pathUtils.appendTrailingSlash(parts.slice(0, i + 1).join('/'));
        folders.add(prefix);
      }
    }
    return Array.from(folders).sort();
  }

  /**
 * Replaces a matching path prefix with a new segment while preserving remaining path parts.
 * e.g., replacing "folder2/folder2-2/" with "folder2-3" in "folder2/folder2-2/folder2-2/.keep" results in "folder2/folder2-3/folder2-2/.keep".
 *
 * @param {string} fullPath - The full original path (e.g., "folder2/folder2-2/folder2-2/.keep").
 * @param {string} targetSegment - The path prefix to replace (e.g., "folder2/folder2-2/").
 * @param {string} replacementSegment - The new segment to insert (e.g., "folder2-3").
 * @returns {string} The updated path.
 */
  static replacePathSegment(fullPath, targetSegment, replacementSegment) {
    if (typeof fullPath !== 'string' || !fullPath) return '';
    if (!targetSegment || !replacementSegment) return fullPath;
    const normalizedTarget = pathUtils.removeTrailingSlash(targetSegment);
    const normalizedReplacement = pathUtils.removeTrailingSlash(replacementSegment);
    if (fullPath.startsWith(normalizedTarget)) {
      return `${pathUtils.removeLastSegment(targetSegment)}${fullPath.replace(normalizedTarget, normalizedReplacement)}`;
    }
  }

  /**
 * Removes the specified parent path prefix from a full path string.
 * @param {string} fullPath - The complete path (e.g., 'folder1/folder2/file.txt').
 * @param {string} parentPath - The parent path to remove (e.g., 'folder1/').
 * @returns {string} The path with the parent portion removed. If it doesn't start with the parent path, returns the original path.
 */
  static removeParentPath(fullPath, parentPath) {
    if (!fullPath.startsWith(parentPath)) return fullPath;
    return fullPath.slice(parentPath.length);
  }
}

export default pathUtils;
