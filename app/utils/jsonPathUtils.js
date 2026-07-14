import { validatePath } from 'asl-path-validator';
import { AslPathContext } from 'asl-path-validator/dist/types';
import { JSONPath } from 'jsonpath-plus';
import { ExternalMemoryParams } from '~/constants/ActionExecutionConstant';
import { Type as ExternalMemoryType } from '~/constants/ExternalMemoryConstant';

const IGNORED_TEMPLATE_FIELDS = [
  'stateMemoryOutputSelector',
  'outputSelector',
];

class jsonPathUtils {
  /**
   * Parses JSONPath expressions from a given string and extracts their path tokens.
   *
   * - Supports JSONPath expressions starting with `$` and containing dot/bracket notation.
   * - Ignores standalone `$` (must be followed by a valid path).
   * - It supports both dot notation (e.g., $.key) and bracket notation (e.g., ['key'], ["key"], or [*]).
   *
   * @param {string} path - The string containing one or more JSONPath expressions.
   * @returns {string[][]} An array of arrays, where each inner array contains the tokens of a matched JSONPath expression.
   */
  static parsePathTokens(path) {
    path = path.trim();
    // Regex to match all JSONPath expressions starting with $ and followed by any combination of dot/bracket notation
    const regexJsonPath = /\$[a-zA-Z0-9_.[\]'"*-]+/g;
    const matches = path.match(regexJsonPath);
    if (!matches) return [];
    const allTokens = [];
    for (const match of matches) {
      const regex = /(?:\.([a-zA-Z0-9_-]+))|\[(\d+|\*|'([^']+)'|"([^"]+)")\]/g;
      const numberRegex = /^\d+$/;
      let result;
      const tokens = [];
      while ((result = regex.exec(match)) !== null) {
        // Capture the pattern with dot notation
        if (result[1]) {
          tokens.push(result[1]);
          continue;
        }
        // Capture the pattern with bracket notation
        if (result[2]) {
          // [*] or [number]
          if (result[2] === '*' || numberRegex.test(result[2])) {
            tokens.push(result[2]);
            continue;
          }
          // ['foo']
          if (result[3]) {
            tokens.push(result[3]);
            continue;
          }
          // ["foo"]
          if (result[4]) {
            tokens.push(result[4]);
            continue;
          }
        }
      }
      if (tokens.length) {
        allTokens.push(tokens);
      }
    }
    return allTokens;
  }

  /**
   * Generates a JSON object structure based on a given JSON path string.
   * If the path starts with $.[number] (e.g. $.[0] or $.[123].anything), returns {}.
   *
   * @param {string} path - The JSON path string to convert into a JSON structure.
   * @returns {Object} The merged JSON object structure derived from all parsed token arrays.
   */
  static generateJsonFromPath(path, externalMemoryId) {
    // If the path starts with $.[number], return an empty object.
    // The regex is a hardcoded literal with no nested quantifiers, so it is not vulnerable to catastrophic backtracking (ReDoS). False positive.
    // nosemgrep: nodejs_scan.javascript-dos-rule-regex_dos
    if (/^\$\s*\.?\s*\[\s*\d+\s*\]/.test(path.trim())) return {};
    const allTokens = jsonPathUtils.parsePathTokens(path);
    if (!allTokens?.length) return {};
    const buildNode = (tokens, index = 0) => {
      if (index >= tokens.length) return '';
      const segment = tokens[index];
      const isLast = index === tokens.length - 1;
      // Array index: create array with index + 1 elements
      if (/^\d+$/.test(segment)) {
        const arraySize = parseInt(segment, 10) + 1;
        return Array.from({ length: arraySize }, () => buildNode(tokens, index + 1));
      }
      // Wildcard: return empty array if last, otherwise single element array
      if (segment === '*') {
        return isLast ? [] : [buildNode(tokens, index + 1)];
      }
      // Regular property: create object with the segment as key
      const value = isLast
        ? (segment === ExternalMemoryParams.EXTERNAL_MEMORY_ID_KEY ? externalMemoryId ?? '' : '')
        : buildNode(tokens, index + 1);
      return { [segment]: value };
    };
    return allTokens.reduce((acc, tokens) => {
      if (tokens.length === 0 || tokens.every(t => t === '*')) return acc;
      const structure = buildNode(tokens);
      return Array.isArray(structure) ? structure : { ...acc, ...structure };
    }, {});
  }

  /**
   * Generates an input template and external memory input template from a given object,
   * resolving JSONPath references and handling external memory sources.
   *
   * @param {Object|Array} obj - The input object or array to generate the template from.
   * @param {Object} [externalMemoryInputTemplate={}] - An object to accumulate external memory input templates.
   * @param {Map<string, string>} [idToExternalMemoryMap=new Map()] - A map to track JSONPath IDs to generated external memory IDs.
   * @returns {{ inputTemplate: Object, externalMemoryInputTemplate: Object }} An object containing the generated input template and the external memory input template.
   */
  static generateTemplate = (obj, externalMemoryInputTemplate = {}, idToExternalMemoryMap = new Map()) => {
    const generateExternalMemoryId = () => `mocked-${Date.now()}-${strUtils.generateRandom(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')}`;
    // Initialize result with empty inputTemplate and reference to externalMemoryInputTemplate
    const result = { inputTemplate: {}, externalMemoryInputTemplate };
    if (!obj || typeof obj !== 'object') {
      return result;
    }
    if (Array.isArray(obj)) {
      result.inputTemplate = obj.reduce((acc, item) => {
        const resolved = jsonPathUtils.generateTemplate(item, externalMemoryInputTemplate, idToExternalMemoryMap);
        return { ...acc, ...resolved.inputTemplate };
      }, {});
      return result;
    }
    const isExternalMemory = obj.type === ExternalMemoryType.EXTERNAL_MEMORY.value || obj.type === ExternalMemoryType.EXTERNAL_MEMORY_LIST.value;
    // Check if there's an id.$ or ids.$ key at the same level and get its value
    let externalMemoryId;
    let shouldProcessJsonpath = false;
    if (isExternalMemory && obj.jsonpath) {
      const idKey = Object.keys(obj).find(key => key === 'id.$' || key.endsWith('.id.$') || key === 'ids.$' || key.endsWith('.ids.$'));
      const idValue = idKey ? obj[idKey] : null;
      // Only process jsonpath when the id value is a valid JSONPath
      if (idValue && jsonPathUtils.isJsonPath(idValue)) {
        shouldProcessJsonpath = true;
        externalMemoryId = idToExternalMemoryMap.get(idValue);
        if (!externalMemoryId) {
          externalMemoryId = generateExternalMemoryId();
          idToExternalMemoryMap.set(idValue, externalMemoryId);
        }
      }
    }
    result.inputTemplate = Object.keys(obj).reduce((acc, key) => {
      if (IGNORED_TEMPLATE_FIELDS.includes(key)) {
        return acc;
      }
      const value = obj[key];
      if (key === 'jsonpath' && isExternalMemory) {
        if (shouldProcessJsonpath) {
          // Generate JSON and store it in external memory
          const generatedJson = jsonPathUtils.generateJsonFromPath(value, externalMemoryId);
          // If externalMemoryInputTemplate already has this id, merge with existing object
          if (externalMemoryInputTemplate[externalMemoryId]) {
            externalMemoryInputTemplate[externalMemoryId] = objUtils.deepMerge(externalMemoryInputTemplate[externalMemoryId], generatedJson);
          } else {
            externalMemoryInputTemplate[externalMemoryId] = generatedJson;
          }
        }
        // Don't add jsonpath to inputTemplate regardless of processing status
        return acc;
      }
      // If the value is a string and a valid JSONPath, generate and merge
      if (typeof value === 'string') {
        if (!jsonPathUtils.isJsonPath(value)) return acc;
        const generatedJson = jsonPathUtils.generateJsonFromPath(value, shouldProcessJsonpath ? externalMemoryId : generateExternalMemoryId());
        return objUtils.deepMerge(acc, generatedJson);
      }
      const nested = jsonPathUtils.generateTemplate(value, externalMemoryInputTemplate, idToExternalMemoryMap);
      return { ...acc, ...nested.inputTemplate };
    }, {});
    return result;
  };

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

  /**
   * Queries an object using a JSONPath expression.
   *
   * @param {Object} object - The object to query.
   * @param {string} path - The JSONPath expression to use for querying.
   * @returns {Object|null} The result of the query, or null if the path is not a valid JSONPath expression.
   */
  static query(object, path) {
    if (!jsonPathUtils.isJsonPath(path)) return null;
    try {
      return JSONPath({ path, json: object });
    } catch {
      return null;
    }
  }
}

export default jsonPathUtils;
