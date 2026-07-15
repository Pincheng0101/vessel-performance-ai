import { validatePath } from 'asl-path-validator';
import { AslPathContext } from 'asl-path-validator/dist/types';

class jsonPathUtils {
  /**
   * Checks if a given string is a valid JSONPath expression.
   *
   * @param {string} str - The string to be checked.
   * @returns {boolean} Returns true if the string is a valid JSONPath expression, otherwise false.
   */
  static isJsonPath(str) {
    // Check if input is a non-empty string
    if (typeof str !== 'string' || str.trim().length === 0) return false;
    // Special case for root path
    if (str === '$') return true;
    // Helper function to validate individual path parts
    const validatePathPart = (part) => {
      // Skip empty parts
      if (!part) return true;
      // Disallow bracket strings whose content starts with a number, e.g., ['123'], ["123foo"]
      if (/\[['"]\d/.test(part)) return false;
      // Disallow dot notation keys starting with a number, e.g., 123foo
      if (/^\d/.test(part)) return false;
      const testPath = part.startsWith('[')
        ? `$${part}` // e.g., $[0]
        : `$.${part}`; // e.g., $.key
      const { isValid } = validatePath(testPath, AslPathContext.PAYLOAD_TEMPLATE);
      return isValid;
    };
    // Validate paths starting with '$'
    if (str.startsWith('$')) {
      const validPrefixes = ['$.', '$$.', '$['];
      if (validPrefixes.some(prefix => str.startsWith(prefix))) {
        const parts = str.split(/\.(?![^[]*\])/g); // Split by dot not inside brackets
        return parts.every(validatePathPart);
      }
      return false;
    }
    // Fallback validation for other cases, e.g., Step Functions intrinsic functions
    const { isValid } = validatePath(str, AslPathContext.PAYLOAD_TEMPLATE);
    return isValid;
  }
}

export default jsonPathUtils;
