import { describe, expect, test } from 'vitest';
import jsonSchemaUtils from './jsonSchemaUtils';

describe('jsonSchemaUtils.getDefaultValue', () => {
  test.each([
    ['string', ''],
    ['integer', 0],
    ['number', 0],
    ['boolean', false],
    ['file', ''],
  ])('returns %j as %j', (type, expected) => {
    expect(jsonSchemaUtils.getDefaultValue(type)).toBe(expected);
  });

  test.each([
    ['array', []],
    ['object', {}],
  ])('returns a fresh %s default', (type, expected) => {
    expect(jsonSchemaUtils.getDefaultValue(type)).toEqual(expected);
  });

  test('returns null for unknown types', () => {
    expect(jsonSchemaUtils.getDefaultValue('mystery')).toBeNull();
  });
});

describe('jsonSchemaUtils.generateTemplate', () => {
  test('returns null when no schema is provided', () => {
    expect(jsonSchemaUtils.generateTemplate(null)).toBeNull();
  });

  test('prefers the schema-defined default when it is not an empty object', () => {
    expect(jsonSchemaUtils.generateTemplate({ type: 'string', default: 'fallback' })).toBe('fallback');
  });

  test('builds a nested object skeleton from properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'integer' },
      },
    };
    expect(jsonSchemaUtils.generateTemplate(schema)).toEqual({ name: '', count: 0 });
  });

  test('returns the type default when no properties are defined', () => {
    expect(jsonSchemaUtils.generateTemplate({ type: 'array' })).toEqual([]);
  });
});

describe('jsonSchemaUtils.sanitize', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer' },
    },
  };

  test('replaces values of the wrong type with the template default', () => {
    expect(jsonSchemaUtils.sanitize({ name: 'A', age: 'not a number' }, schema))
      .toEqual({ name: 'A', age: 0 });
  });

  test('preserves extra keys when strict mode is off', () => {
    expect(jsonSchemaUtils.sanitize({ name: 'A', age: 1, extra: 'x' }, schema))
      .toEqual({ name: 'A', age: 1, extra: 'x' });
  });

  test('drops extra keys when strict mode is on', () => {
    expect(jsonSchemaUtils.sanitize({ name: 'A', age: 1, extra: 'x' }, schema, true))
      .toEqual({ name: 'A', age: 1 });
  });
});

describe('jsonSchemaUtils.isExpectedType', () => {
  test.each([
    ['x', 'string', true],
    [1, 'integer', true],
    [1.5, 'number', true],
    [true, 'boolean', true],
    [[], 'array', true],
    [{}, 'object', true],
    ['/path', 'file', true],
    ['x', 'number', false],
    [[], 'object', false],
    [null, 'object', false],
  ])('isExpectedType(%j, %j) is %j', (value, type, expected) => {
    expect(jsonSchemaUtils.isExpectedType(value, type)).toBe(expected);
  });

  test('returns false for unknown expected types', () => {
    expect(jsonSchemaUtils.isExpectedType('x', 'mystery')).toBe(false);
  });
});

describe('jsonSchemaUtils.sortObject', () => {
  test('orders keys according to the _order metadata in schema properties', () => {
    const obj = { b: 2, a: 1, c: 3 };
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string', _order: 2 },
        b: { type: 'string', _order: 1 },
        c: { type: 'string', _order: 3 },
      },
    };
    expect(Object.keys(jsonSchemaUtils.sortObject(obj, schema))).toEqual(['b', 'a', 'c']);
  });

  test('places extra keys after schema-defined keys', () => {
    const obj = { extra: true, a: 1 };
    const schema = { type: 'object', properties: { a: { type: 'integer' } } };
    expect(Object.keys(jsonSchemaUtils.sortObject(obj, schema))).toEqual(['a', 'extra']);
  });

  test('returns the input unchanged when schema type is not object', () => {
    expect(jsonSchemaUtils.sortObject({ a: 1 }, { type: 'string' })).toEqual({ a: 1 });
  });
});

describe('jsonSchemaUtils.validate', () => {
  test('returns true when the object matches the schema', () => {
    expect(jsonSchemaUtils.validate(
      { name: 'A' },
      { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    )).toBe(true);
  });

  test('returns false when the object violates the schema', () => {
    expect(jsonSchemaUtils.validate(
      { name: 1 },
      { type: 'object', properties: { name: { type: 'string' } } },
    )).toBe(false);
  });

  test('returns false when either argument is missing', () => {
    expect(jsonSchemaUtils.validate(null, {})).toBe(false);
    expect(jsonSchemaUtils.validate({}, null)).toBe(false);
  });
});

describe('jsonSchemaUtils.generateFromJson', () => {
  test('emits an object schema with typed properties', () => {
    expect(jsonSchemaUtils.generateFromJson({ name: 'A', age: 1 })).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
    });
  });

  test('uses the first item to type an array when all items share that shape', () => {
    expect(jsonSchemaUtils.generateFromJson([1, 2, 3])).toEqual({
      type: 'array',
      items: { type: 'integer' },
    });
  });

  test('falls back to empty items when array elements have mixed shapes', () => {
    expect(jsonSchemaUtils.generateFromJson([1, 'x'])).toEqual({
      type: 'array',
      items: {},
    });
  });

  test('distinguishes integer from number', () => {
    expect(jsonSchemaUtils.generateFromJson(1.5)).toEqual({ type: 'number' });
  });
});

describe('jsonSchemaUtils.dereference', () => {
  test('expands an internal $ref into its target schema', () => {
    const schema = {
      $defs: { Name: { type: 'string' } },
      type: 'object',
      properties: { name: { $ref: '#/$defs/Name' } },
    };
    const result = jsonSchemaUtils.dereference(schema);
    expect(result.properties.name).toEqual({ type: 'string' });
  });

  test('merges sibling keys over the expanded reference', () => {
    const schema = {
      $defs: { Name: { type: 'string', description: 'base' } },
      type: 'object',
      properties: { name: { $ref: '#/$defs/Name', description: 'override' } },
    };
    expect(jsonSchemaUtils.dereference(schema).properties.name.description).toBe('override');
  });

  test('throws when an external $ref is encountered', () => {
    const schema = { type: 'object', properties: { x: { $ref: 'http://example.com/schema' } } };
    expect(() => jsonSchemaUtils.dereference(schema)).toThrow(/Only internal/);
  });

  test('returns non-object input unchanged', () => {
    expect(jsonSchemaUtils.dereference(null)).toBeNull();
  });
});

describe('jsonSchemaUtils.getMainType', () => {
  test('returns the first non-null type from a type array', () => {
    expect(jsonSchemaUtils.getMainType({ type: ['null', 'string'] })).toBe('string');
  });

  test('returns the type as-is when it is a single string', () => {
    expect(jsonSchemaUtils.getMainType({ type: 'integer' })).toBe('integer');
  });

  test('falls back to anyOf when there is no direct type', () => {
    expect(jsonSchemaUtils.getMainType({ anyOf: [{ type: 'null' }, { type: 'boolean' }] }))
      .toBe('boolean');
  });

  test('returns "null" when nothing else is found', () => {
    expect(jsonSchemaUtils.getMainType({ type: 'null' })).toBe('null');
  });
});

describe('jsonSchemaUtils.hasNullType', () => {
  test('returns true when null is one of the declared types', () => {
    expect(jsonSchemaUtils.hasNullType({ type: ['string', 'null'] })).toBe(true);
  });

  test('returns false when null is absent', () => {
    expect(jsonSchemaUtils.hasNullType({ type: 'string' })).toBe(false);
  });
});
