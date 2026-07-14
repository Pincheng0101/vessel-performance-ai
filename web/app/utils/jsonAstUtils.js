export class jsonAstUtils {
  /**
   * Build a JSON AST and include the text position (offset range) for each node.
   * @param {string} jsonText
   * @returns {object} AST
   */
  static buildAst(jsonText) {
    let index = 0;

    const skipWhitespace = () => {
      while (/\s/.test(jsonText[index])) index++;
    };

    const parseValue = () => {
      skipWhitespace();
      const char = jsonText[index];
      if (char === '{') return parseObject();
      if (char === '[') return parseArray();
      if (char === '"') return parseString();
      if (/[\d-]/.test(char)) return parseNumber();
      if (jsonText.startsWith('true', index)) return parseLiteral('true', true);
      if (jsonText.startsWith('false', index)) return parseLiteral('false', false);
      if (jsonText.startsWith('null', index)) return parseLiteral('null', null);
      throw new Error(`Unexpected token at ${index}`);
    };

    const parseObject = () => {
      const node = { type: 'Object', children: [], loc: {} };
      node.loc.start = index++;
      skipWhitespace();
      while (jsonText[index] !== '}') {
        const keyNode = parseString();
        skipWhitespace();
        if (jsonText[index] !== ':') throw new Error(`Expected ':' at ${index}`);
        index++;
        const valueNode = parseValue();
        node.children.push({ key: keyNode, value: valueNode });
        skipWhitespace();
        if (jsonText[index] === ',') index++;
        skipWhitespace();
      }
      node.loc.end = ++index;
      return node;
    };

    const parseArray = () => {
      const node = { type: 'Array', children: [], loc: {} };
      node.loc.start = index++;
      skipWhitespace();
      while (jsonText[index] !== ']') {
        node.children.push(parseValue());
        skipWhitespace();
        if (jsonText[index] === ',') index++;
        skipWhitespace();
      }
      node.loc.end = ++index;
      return node;
    };

    const parseString = () => {
      const start = index;
      index++;
      while (jsonText[index] !== '"') {
        if (jsonText[index] === '\\') index++;
        index++;
      }
      index++;
      return {
        type: 'String',
        value: JSON.parse(jsonText.slice(start, index)),
        loc: { start, end: index },
      };
    };

    const parseNumber = () => {
      const start = index;
      while (/[0-9eE.+-]/.test(jsonText[index])) index++;
      return {
        type: 'Number',
        value: Number(jsonText.slice(start, index)),
        loc: { start, end: index },
      };
    };

    const parseLiteral = (text, value) => {
      const start = index;
      index += text.length;
      return {
        type: 'Literal',
        value,
        loc: { start, end: index },
      };
    };

    try {
      return parseValue();
    } catch (error) {
      return {
        type: 'Error',
        message: error.message,
        loc: { start: index, end: index + 1 },
      };
    }
  }

  /**
   * Find the text position of an AST node based on the path parts from a JSON Pointer.
   * @param {object} ast
   * @param {string[]} pathParts
   * @returns {{ start: number, end: number } | null}
   */
  static findLocationByPath(ast, pathParts, options = {}) {
    let current = ast;
    for (const [i, part] of pathParts.entries()) {
      if (!current) return null;
      if (current.type === 'Object') {
        const match = current.children.find(c => c.key.value === part);
        if (!match) return null;
        if (i === pathParts.length - 1) {
          if (options.locateKey) {
            return { loc: match.key.loc, node: match.key };
          }
          if (options.locateValue) {
            return { loc: match.value.loc, node: match.value };
          }
        }
        current = match.value;
      } else if (current.type === 'Array') {
        const index = Number(part);
        if (!Number.isInteger(index) || !current.children?.[index]) return null;
        current = current.children[index];
      } else {
        return null;
      }
    }
    return current ? { loc: current.loc, node: current } : null;
  }

  /**
   * Recursively searches for a property node with the specified key name within a JSON AST object node.
   *
   * @param {object} node - The AST node representing a JSON object.
   * @param {string} key - The key to search for. If an empty string, matches properties with an empty key.
   * @returns {object|null} The property node with the matching key name, or null if not found.
   */
  static findPropertyNodeByKey(node, key) {
    if (!node || node.type !== 'Object' || !Array.isArray(node.children)) return null;

    for (const prop of node.children) {
      if (prop.key?.value === key || (key === '' && prop.key?.raw === '""')) {
        return prop;
      }
      if (prop.value?.type === 'Object') {
        const found = jsonAstUtils.findPropertyNodeByKey(prop.value, key);
        if (found) return found;
      }
      if (prop.value?.type === 'Array') {
        for (const child of prop.value.children ?? []) {
          const found = jsonAstUtils.findPropertyNodeByKey(child, key);
          if (found) return found;
        }
      }
    }
    return null;
  }

  /**
   * Wrap a simple interface that accepts a JSON string and an instancePath, and directly returns { from, to }.
   * @param {string} jsonText
   * @param {object} error
   * @returns {{ from: number, to: number }}
   */
  static getOffsetRange(jsonText, error) {
    try {
      const { data, instancePath, keyword, schema, params, message } = error;
      const ast = jsonAstUtils.buildAst(jsonText);
      const pathParts = instancePath.split('/').slice(1);
      const result = jsonAstUtils.findLocationByPath(ast, pathParts);
      if (result) {
        const { loc, node } = result;
        if (loc) {
          if (
            schema?.oneOf
            || schema?.not
            || (typeof data === 'object' && message?.startsWith('missing'))
            || message.includes('one comparison operator')
          ) {
            return { from: loc.start, to: loc.start + 1 };
          }
          if (schema?.additionalProperties && params?.errors[0].params.additionalProperty) {
            const targetKey = params?.errors[0].params.additionalProperty;
            const targetProp = jsonAstUtils.findPropertyNodeByKey(node, targetKey);
            if (targetProp?.key?.loc.start != null) {
              return {
                from: targetProp.key.loc.start,
                to: targetProp.value?.end ?? targetProp.key.loc.end ?? (targetProp.key.loc.start + targetKey.length),
              };
            }
          }
          if (keyword === 'required') {
            return { from: loc.start, to: loc.start + 1 };
          }
          if (params.errors && params.errors[0]?.keyword === 'jsonPathBinding') {
            const invalidJsonPathBindings = referencePathUtils.findInvalidJsonPathBindings(params.errors[0].data);
            const ranges = [];
            invalidJsonPathBindings.forEach((invalid) => {
              const propNode = jsonAstUtils.findPropertyNodeByKey(node, invalid.key);
              if (invalid.type === 'key' && propNode?.key?.loc) {
                ranges.push({ from: propNode.key.loc.start, to: propNode.key.loc.end });
              }
              if (invalid.type === 'value' && propNode?.value?.loc) {
                ranges.push({ from: propNode.value.loc.start, to: propNode.value.loc.end });
              }
            });
            if (ranges.length > 0) return ranges;
          }
          return { from: loc.start, to: loc.end };
        }
      }
    } catch (error) {
      console.error('AST parse error:', error);
    }
    return { from: 0, to: 1 };
  }
}
