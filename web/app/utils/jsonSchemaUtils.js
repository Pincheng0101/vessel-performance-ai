import Ajv from 'ajv';

class jsonSchemaUtils {
  /**
   * Returns the basic default value based on the given JSON schema type.
   *
   * @param {string} type - The JSON schema type.
   * @returns {*} The default value corresponding to the type.
   */
  static getDefaultValue = (type) => {
    const typeMap = {
      string: '',
      integer: 0,
      number: 0,
      boolean: false,
      array: [],
      object: {},
      file: '',
    };

    return typeMap[type] ?? null;
  };

  /**
   * Generates a template value based on the provided JSON schema.
   *
   * @param {Object} schema - The JSON schema object.
   * @param {string|string[]} schema.type - The type(s) defined in the schema.
   * @param {Object} schema.default - The default value defined in the schema.
   * @param {Object} schema.properties - The properties of the object if the type is 'object'.
   * @returns {*} The generated template value based on the schema type.
   */
  static generateTemplate = (schema) => {
    if (!schema) return null;
    if (schema.default && JSON.stringify(schema.default) !== '{}') {
      return schema.default;
    }
    const type = jsonSchemaUtils.getMainType(schema);
    if (type === 'object' && schema.properties) {
      return Object.entries(schema.properties).reduce((obj, [key, value]) => {
        obj[key] = jsonSchemaUtils.generateTemplate(value);
        return obj;
      }, {});
    }
    return jsonSchemaUtils.getDefaultValue(type);
  };

  /**
   * Sanitizes an object based on a given JSON schema.
   *
   * @param {Object} obj - The object to be sanitized.
   * @param {Object} schema - The JSON schema to use for sanitization.
   * @param {boolean} strict - If true, only properties defined in the schema will be kept.
   * @returns {Object} The sanitized object.
   */
  static sanitize = (obj, schema, strict = false) => {
    if (!obj || !schema || schema.type !== 'object' || !schema.properties || Object.keys(schema.properties).length < 1) {
      return obj;
    }
    obj = Object.keys(obj)
      .filter(key => strict ? Object.hasOwn(schema.properties, key) : true)
      .reduce((filteredObj, key) => {
        filteredObj[key] = obj[key];
        return filteredObj;
      }, {});
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const mainType = jsonSchemaUtils.getMainType(propSchema);
      if (!mainType) {
        continue;
      }
      if (!Object.hasOwn(obj, key) || !jsonSchemaUtils.isExpectedType(obj[key], mainType)) {
        obj[key] = jsonSchemaUtils.generateTemplate(propSchema);
        continue;
      }
      if (mainType === 'object' && propSchema.properties) {
        obj[key] = jsonSchemaUtils.sanitize(obj[key], propSchema);
      }
    }
    return obj;
  };

  /**
   * Checks if the given value matches the expected type.
   *
   * @param {*} value - The value to check.
   * @param {string} expectedType - The expected type of the value. Can be one of 'string', 'number', 'boolean', 'array', 'object', or 'file'.
   * @returns {boolean} Returns true if the value matches the expected type, otherwise false.
   */
  static isExpectedType = (value, expectedType) => {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'integer':
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'file':
        return typeof value === 'string';
      default:
        return false;
    }
  };

  /**
   * Sorts the properties of an object based on the order specified in the schema.
   *
   * @param {Object} obj - The object to be sorted.
   * @param {Object} schema - The JSON schema that defines the order of the properties.
   * @param {string} orderKey - The key in the schema properties that defines the order.
   * @returns {Object} The sorted object.
   */
  static sortObject = (obj, schema, orderKey = '_order') => {
    if (typeof obj !== 'object' || obj === null || !schema || schema.type !== 'object') {
      return obj;
    }

    if (schema.properties) {
      const orderedKeys = Object.entries(schema.properties)
        .sort(([, a], [, b]) => (a[orderKey] ?? Infinity) - (b[orderKey] ?? Infinity))
        .map(([key]) => key);

      const unorderedKeys = Object.keys(schema.properties).filter(
        key => !(orderKey in schema.properties[key]),
      );

      const extraKeys = Object.keys(obj).filter(key => !schema.properties[key]);

      const allKeys = [...orderedKeys, ...unorderedKeys, ...extraKeys];

      return allKeys.reduce((sortedObj, key) => {
        if (key in obj) {
          const propertySchema = schema.properties[key];
          sortedObj[key] = propertySchema && propertySchema.type === 'object' && (propertySchema.properties || propertySchema.additionalProperties)
            ? jsonSchemaUtils.sortObject(obj[key], propertySchema)
            : obj[key];
        }
        return sortedObj;
      }, {});
    }

    if (schema.additionalProperties) {
      const keys = Object.keys(obj);
      return keys.reduce((sortedObj, key) => {
        sortedObj[key] = jsonSchemaUtils.sortObject(obj[key], schema.additionalProperties);
        return sortedObj;
      }, {});
    }

    return obj;
  };

  /**
   * Validates a JavaScript object against a given JSON schema using AJV.
   *
   * @param {Object} obj - The object to validate.
   * @param {Object} schema - The JSON schema to validate against.
   * @returns {boolean} Returns true if the object is valid according to the schema, otherwise false.
   */
  static validate = (obj, schema) => {
    if (!obj || !schema) return false;
    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(schema);
    return validate(obj);
  };

  /**
   * Generates a JSON schema from a JSON object.
   *
   * @param {*} jsonObject - The JSON object to generate schema from.
   * @returns {Object} The generated JSON schema object.
   */
  static generateFromJson = (jsonObject) => {
    const analyzeValue = (value) => {
      if (value === null) {
        return {
          type: 'null',
        };
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return {
            type: 'array',
            items: {},
          };
        }
        // Analyze first item to determine array item schema
        const itemSchema = analyzeValue(value.at(0));
        // Check if all items have the same type
        const allSameType = value.every((item) => {
          const currentSchema = analyzeValue(item);
          return JSON.stringify(currentSchema) === JSON.stringify(itemSchema);
        });
        return {
          type: 'array',
          items: allSameType ? itemSchema : {},
        };
      }
      const type = typeof value;
      switch (type) {
        case 'string': {
          return {
            type: 'string',
          };
        }
        case 'number': {
          return {
            type: Number.isInteger(value) ? 'integer' : 'number',
          };
        }
        case 'boolean': {
          return {
            type: 'boolean',
          };
        }
        case 'object': {
          const properties = {};
          for (const [key, val] of Object.entries(value)) {
            properties[key] = analyzeValue(val);
          }
          return {
            type: 'object',
            properties,
          };
        }
        default: {
          return {
            type: 'string',
          };
        }
      }
    };
    return analyzeValue(jsonObject);
  };

  /**
   * Dereference (expand) internal $ref in a JSON schema.
   * - Support internal JSON pointer such as "#/$defs/..." and "#/definitions/...".
   * - If there are other keywords at the same level as $ref, they will be merged back using objUtils.deepMerge after expansion (sibling keys override the expanded result).
   * - Only handles "internal" references; external URLs will throw an error.
   *
   * @param {Object} schema
   * @returns {Object}
   */
  static dereference(schema) {
    if (!schema || typeof schema !== 'object') return schema;

    // Create a clean deep copy of the schema
    const root = objUtils.toRaw(schema);

    const TRAVERSAL_KEYS = [
      'properties',
      'patternProperties',
      'definitions',
      '$defs',
      'dependencies',
      'dependentSchemas',
      'allOf',
      'anyOf',
      'oneOf',
      'not',
      'if',
      'then',
      'else',
      'items',
      'contains',
      'additionalProperties',
      'propertyNames',
      'unevaluatedItems',
      'unevaluatedProperties',
    ];

    const decodePointerToken = token =>
      token.replace(/~1/g, '/').replace(/~0/g, '~');

    const getByJsonPointer = (rootObj, pointer) => {
      if (typeof pointer !== 'string') throw new Error(`$ref must be string, got ${typeof pointer}`);
      if (!pointer.startsWith('#')) {
        // Only internal references are supported here
        throw new Error(`Only internal $ref is supported: ${pointer}`);
      }
      if (pointer === '#') return rootObj;
      const parts = pointer.split('/').slice(1); // Drop "#"
      let cur = rootObj;
      for (const raw of parts) {
        const key = decodePointerToken(raw);
        if (key === '') continue;
        if (cur == null || !(key in cur)) {
          throw new Error(`$ref not found at pointer: ${pointer}`);
        }
        cur = cur[key];
      }
      return cur;
    };

    const seen = new WeakMap();

    const walk = (node) => {
      if (!objUtils.isObject(node) && !Array.isArray(node)) return node;

      if (seen.has(node)) return seen.get(node);

      let result = Array.isArray(node) ? node.map(walk) : { ...node };
      seen.set(node, result);

      // 1) If the node is an object, handle $ref first
      if (objUtils.isObject(result) && typeof result.$ref === 'string') {
        const refTarget = getByJsonPointer(root, result.$ref);
        const resolved = walk(refTarget); // Recursively expand the referenced content

        // Sibling keys (other than $ref) should be merged back, allowing siblings to override the expanded result
        const siblings = { ...result };
        delete siblings.$ref;
        const merged = Object.keys(siblings).length > 0
          ? objUtils.deepMerge(resolved, walk(siblings))
          : resolved;

        result = merged;
        seen.set(node, result);
      }

      // 2) Recursively walk other schema-bearing fields
      if (Array.isArray(result)) {
        result = result.map(walk);
        seen.set(node, result);
        return result;
      }

      if (objUtils.isObject(result)) {
        for (const key of TRAVERSAL_KEYS) {
          const val = result[key];
          if (val == null) continue;

          // Map-like objects
          if (key === 'properties' || key === 'patternProperties' || key === 'definitions' || key === '$defs' || key === 'dependentSchemas') {
            const obj = {};
            for (const [k, v] of Object.entries(val)) {
              obj[k] = walk(v);
            }
            result[key] = obj;
            continue;
          }

          // Arrays of schemas
          if (Array.isArray(val)) {
            result[key] = val.map(walk);
            continue;
          }

          // Single schema object
          if (objUtils.isObject(val)) {
            result[key] = walk(val);
            continue;
          }
        }
      }

      return result;
    };

    return walk(root);
  }

  /**
   * Returns the main type of the schema.
   *
   * @param {Object} schema - The schema to get the main type of.
   * @returns {string|null} - The main type of the schema.
   */
  static getMainType(schema) {
    const direct = arrUtils.cast(schema.type).find(t => t && t !== 'null');
    if (direct) return direct;
    const unions = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])];
    for (const sub of unions) {
      const t = jsonSchemaUtils.getMainType(sub);
      if (t !== 'null') return t;
    }
    return 'null';
  }

  /**
   * Checks if the schema has a null type.
   *
   * @param {Object} schema - The schema to check.
   * @returns {boolean} - Whether the schema has a null type.
   */
  static hasNullType(schema) {
    return arrUtils.cast(schema.type).includes('null');
  }
}

export default jsonSchemaUtils;
