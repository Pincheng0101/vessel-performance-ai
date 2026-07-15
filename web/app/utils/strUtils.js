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
   * Escapes control characters in a given string, converting them into their escaped forms.
   * For example, carriage return (`\r`) and line feed (`\n`) are transformed into `\\r` and `\\n`.
   *
   * @param {string} str - The string to be escaped.
   * @returns {string} The escaped string.
   *
   * @example
   * const escapedStr = escapeControlChars('Hello\r\nWorld');
   * console.log(escapedStr); // Output: Hello\\r\\nWorld
   */
  static escapeControlChars(str) {
    return JSON.stringify(str).slice(1, -1);
  }

  /**
   * Unescapes a given string, restoring escaped control characters to their original form.
   * For example, `\\r\\n` is converted back to `\r\n`.
   * If parsing fails, the original string is returned.
   *
   * @param {string} str - The string to unescape.
   * @returns {string} The unescaped string or the original string if parsing fails.
   *
   * @example
   * const unescapedStr = unescapeControlChars('Hello\\r\\nWorld');
   * console.log(unescapedStr); // Output: Hello\r\nWorld
   */
  static unescapeControlChars(str) {
    try {
      return JSON.parse(`"${str}"`);
    } catch {
      return str;
    }
  }

  /**
   * Generates a cryptographic nonce by creating a random value using the Web Crypto API,
   * hashing it with SHA-256, and returning the result as a hexadecimal string.
   *
   * @returns {Promise<string>} A promise that resolves to a hexadecimal string representing the nonce.
   */
  static async generateNonce() {
    const hash = await strUtils.toSha256(crypto.getRandomValues(new Uint32Array(4)).toString());
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Converts a given string to a Base64 URL encoded string.
   *
   * @param {string} str - The input string to be converted.
   * @returns {string} The Base64 URL encoded string.
   */
  static toBase64Url(str) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  /**
   * Generates a SHA-256 hash of the given string.
   *
   * @param {string} str - The input string to be hashed.
   * @returns {Promise<ArrayBuffer>} A promise that resolves to an ArrayBuffer containing the SHA-256 hash.
   */
  static toSha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  };

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
   * Checks if a string ends with the specified suffix.
   *
   * @param {string} str - The string to check.
   * @param {string} suffix - The suffix to look for.
   * @returns {boolean} Returns true if the string ends with the suffix, otherwise false.
   */
  static isEndsWith(str, suffix) {
    return String(str).endsWith(suffix);
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
   * Generates a hash value for a given string.
   *
   * @param {string} str - The string to hash.
   * @param {number} seed - An optional seed value to start the hash calculation.
   * @returns {number} The resulting hash value.
   */
  static hash(str, seed = 0) {
    return String(str).split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), seed) >>> 0;
  }

  /**
   * Escapes special characters in a string to safely use in RegExp.
   *
   * @param {string} str - The string to escape.
   * @returns {string} The escaped string.
   */
  static escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Counts how many times a substring appears in a given string.
   *
   * @param {string} str - The text to search within.
   * @param {string} subStr - The substring to count.
   * @returns {number} The number of occurrences.
   */
  static countSubstring(str, subStr) {
    if (!subStr) return 0;
    return str.split(subStr).length - 1;
  }

  /**
   * Truncates a string to a specified maximum length, optionally appending a suffix.
   *
   * @param {string} str - The string to truncate.
   * @param {number} maxLength - The maximum length of the resulting string (including suffix).
   * @param {string} suffix - The suffix to append to truncated strings (default: '...').
   * @returns {string} The truncated string with suffix, or the original string if within maxLength.
   */
  static truncate(str, maxLength, suffix = '...') {
    const text = String(str);
    if (text.length <= maxLength) {
      return text;
    }
    const truncateLength = Math.max(0, maxLength - suffix.length);
    return text.slice(0, truncateLength) + suffix;
  }

  /**
   * Checks if the given string consists only of unsigned digits (0-9).
   *
   * @param {string} str - The string to validate.
   * @returns {boolean} Returns true if the string contains only digits, false otherwise.
   */
  static isUnsignedDigits(str) {
    return /^[0-9]+$/.test(str);
  }

  /**
   * Checks if the given string is a numeric value, including integers and decimals.
   */
  static isNumeric(str) {
    return /^-?\d+(\.\d+)?$/.test(String(str).trim());
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

  /**
   * Generates a password that meets AWS Cognito password policy requirements.
   *
   * Rules enforced:
   * - Minimum length: 8 characters
   * - Must contain at least one uppercase letter
   * - Must contain at least one lowercase letter
   * - Must contain at least one number
   * - Must contain at least one special character (from the allowed set)
   *
   * @param {number} length - The total password length (minimum of 8).
   * @returns {string} A random password that satisfies Cognito requirements.
  */
  static generatePassword(length = 12) {
    const passwordLength = Math.max(8, Number(length) || 12);
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const digitChars = '0123456789';
    const symbolChars = `^$*.[]{}()?-"!@#%&/\\,><':;|_~\`+=`;
    const fullCharPool = uppercaseChars + lowercaseChars + digitChars + symbolChars;
    const pickChar = str => str[randomUtils.secureInt(str.length)];
    const passwordChars = [
      pickChar(uppercaseChars),
      pickChar(lowercaseChars),
      pickChar(digitChars),
      pickChar(symbolChars),
      ...Array.from({ length: passwordLength - 4 }, () => pickChar(fullCharPool)),
    ];
    return arrUtils.shuffle(passwordChars).join('');
  }
}

export default strUtils;
