import { toCamelCase, toKebabCase, toSnakeCase, toTitleCase } from '@kklab/stryle';
import { v4 } from 'uuid';
import { capitalize } from 'vue';

class strUtils {
  /**
   * Generates a universally unique identifier (UUID).
   *
   * @type {Function}
   */
  static uuid = v4;

  /**
   * Capitalizes the first letter of a given string.
   *
   * @param {string} str - The string to capitalize.
   * @returns {string} The capitalized string.
   */
  static capitalize = capitalize;

  /**
   * Converts a string to title case, taking into account specific separators and special terms.
   *
   * @param {string} str - The string to be converted to title case.
   * @returns {string} The converted title case string.
   */
  static toTitleCase(str) {
    // Add word boundaries for short terms to avoid matching inside other words
    const strictBound = text => `(?:^|[^a-zA-Z])${text}(?=[^a-zA-Z]|s|$)`;
    return toTitleCase(str, {
      separators: ['-', '_'],
      specialTerms: [
        'FAQ',
        'HTTP',
        'LLM',
        'OpenSearch',
        'MySQL',
        'SDK',
        'SQL',
        strictBound('API'), // Ignore "therapist" or "capitulate"
        strictBound('ID'), // Ignore "idea" or "kid"
        strictBound('URL'), // Ignore "hourly" or "curly"
      ],
    });
  };

  /**
   * Converts a string to camelCase.
   *
   * @param {string} str - The string to be converted to camelCase.
   * @returns {string} The camelCase version of the input string.
   */
  static toCamelCase = toCamelCase;

  /**
   * Converts a given string to snake_case.
   *
   * @param {string} str - The string to be converted to snake_case.
   * @returns {string} The snake_case version of the input string.
   */
  static toSnakeCase = toSnakeCase;

  /**
   * Converts a given string to kebab-case.
   *
   * @function
   * @name toKebabCase
   * @param {string} str - The string to be converted to kebab-case.
   * @returns {string} The kebab-case version of the input string.
   */
  static toKebabCase = toKebabCase;

  /**
   * Checks if a string starts with the specified prefix.
   *
   * @param {string} str - The string to check.
   * @param {string} prefix - The prefix to look for.
   * @returns {boolean} Returns true if the string starts with the prefix, otherwise false.
   */
  static isStartsWith(str, prefix) {
    return String(str).startsWith(prefix);
  }

  /**
   * Generates a random string of specified length using the given character set.
   *
   * @param {number} length - The length of the random string to generate.
   * @param {string} charset - The set of characters to use for generating the random string.
   * @returns {string} A random string of the specified length.
   */
  static generateRandom(length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    return Array.from({ length }, () => charset.charAt(randomUtils.secureInt(charset.length))).join('');
  }

  /**
   * Adds spaces around ASCII characters in a given string.
   *
   * This function takes a string and inserts spaces between ASCII characters
   * and non-ASCII characters. It ensures that there is a single space between
   * any ASCII and non-ASCII character pair, and it also removes any extra spaces.
   *
   * @param {string} str - The input string to process.
   * @returns {string} The processed string with spaces around ASCII characters.
   */
  static addSpacesAroundAscii(str) {
    return String(str)
      .replace(/([^\x20-\x7E])([\x20-\x7E])/gu, '$1 $2')
      .replace(/([\x20-\x7E])([^\x20-\x7E])/gu, '$1 $2')
      .replace(/ +/g, ' ');
  }

  /**
   * Checks if a given string is a valid URL starting with 'http://' or 'https://'.
   *
   * @param {string} str - The string to be checked.
   * @returns {boolean} Returns true if the string is a valid URL, otherwise false.
   */
  static isValidUrl(str) {
    return strUtils.isStartsWith(str, 'http://') || strUtils.isStartsWith(str, 'https://');
  }

  /**
   * Checks if a given string is empty or consists only of whitespace characters.
   *
   * @param {string} str - The string to check.
   * @returns {boolean} Returns true if the string is empty or contains only whitespace, otherwise false.
   */
  static isEmpty(str) {
    return str === undefined || str === null || (typeof str === 'string' && str.trim().length === 0);
  }

  /**
   * Checks if a string contains common markdown structural syntax (code fence,
   * heading, table row, bold, bullet/numbered list). Used as a heuristic to
   * decide whether streamed content should be treated as a formatted answer.
   *
   * @param {string} str - The string to check.
   * @returns {boolean} True if any markdown structure pattern is matched.
   */
  static hasMarkdownStructure(str) {
    if (!str) return false;
    return /```/.test(str)
      || /(?:^|\n)#{1,6}\s/.test(str)
      || /\|[^\n|]+\|[^\n|]+\|/.test(str)
      || /\*\*[^*\n]+\*\*/.test(str)
      || /(?:^|\n)\s*[-*+]\s+\S/.test(str)
      || /(?:^|\n)\s*\d+\.\s+\S/.test(str);
  }
}

export default strUtils;
