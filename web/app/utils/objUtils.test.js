import { describe, expect, test } from 'vitest';
import { reactive } from 'vue';
import objUtils from './objUtils';

describe('objUtils.isObject', () => {
  test('returns true for plain objects', () => {
    expect(objUtils.isObject({})).toBe(true);
  });

  test.each([null, undefined, [], 'x', 1, true])(
    'returns false for non-plain-object %j',
    (input) => {
      expect(objUtils.isObject(input)).toBe(false);
    },
  );
});

describe('objUtils.isEmpty', () => {
  test('returns true for an empty plain object', () => {
    expect(objUtils.isEmpty({})).toBe(true);
  });

  test('returns false for a populated object', () => {
    expect(objUtils.isEmpty({ a: 1 })).toBe(false);
  });

  test.each([null, [], 'x'])('returns false for non-plain-object %j', (input) => {
    expect(objUtils.isEmpty(input)).toBe(false);
  });
});

describe('objUtils.toRaw', () => {
  test('unwraps a Vue reactive object recursively', () => {
    const state = reactive({ a: 1, nested: { b: 2 } });
    const raw = objUtils.toRaw(state);
    expect(raw).toEqual({ a: 1, nested: { b: 2 } });
  });

  test('walks into arrays of objects', () => {
    const state = reactive([{ a: 1 }, { b: 2 }]);
    expect(objUtils.toRaw(state)).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe('objUtils.extractPropertyKeys', () => {
  test('returns keys nested under the named property recursively', () => {
    const schema = {
      properties: {
        foo: {
          properties: {
            bar: {},
          },
        },
      },
    };
    expect(objUtils.extractPropertyKeys({ object: schema, property: 'properties' })).toEqual(['foo', 'bar']);
  });

  test('returns undefined when object or property is missing', () => {
    expect(objUtils.extractPropertyKeys({ object: null, property: 'properties' })).toBeUndefined();
    expect(objUtils.extractPropertyKeys({ object: {}, property: '' })).toBeUndefined();
  });
});

describe('objUtils.omit', () => {
  test('removes null, undefined, and empty-object values recursively', () => {
    const input = { a: 1, b: null, c: undefined, d: {}, e: { f: null, g: 2 } };
    expect(objUtils.omit(input)).toEqual({ a: 1, e: { g: 2 } });
  });

  test('returns null when the whole object reduces to empty', () => {
    expect(objUtils.omit({ a: null, b: {} })).toBeNull();
  });

  test('filters null/undefined/empty entries inside arrays', () => {
    expect(objUtils.omit([1, null, {}, { a: 1 }])).toEqual([1, { a: 1 }]);
  });
});

describe('objUtils.removeKeys', () => {
  test('removes keys matched by the callback', () => {
    const result = objUtils.removeKeys({ a: 1, _b: 2 }, key => key.startsWith('_'));
    expect(result).toEqual({ a: 1 });
  });

  test('recurses into nested objects and arrays', () => {
    const result = objUtils.removeKeys(
      { a: { _x: 1, y: 2 }, arr: [{ _x: 3, y: 4 }] },
      key => key.startsWith('_'),
    );
    expect(result).toEqual({ a: { y: 2 }, arr: [{ y: 4 }] });
  });
});

describe('objUtils.mutate', () => {
  test('replaces values when the callback returns a value', () => {
    const result = objUtils.mutate({ a: 1, b: 2 }, (key, value) => value * 10);
    expect(result).toEqual({ a: 10, b: 20 });
  });

  test('leaves values unchanged when the callback returns undefined', () => {
    const result = objUtils.mutate({ a: 1, b: 2 }, () => undefined);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test('recurses into nested objects', () => {
    const result = objUtils.mutate({ a: { b: 1 } }, (key, value) => (typeof value === 'number' ? value + 1 : undefined));
    expect(result).toEqual({ a: { b: 2 } });
  });
});

describe('objUtils.deepMerge', () => {
  test('merges nested object properties', () => {
    expect(objUtils.deepMerge({ a: { x: 1 } }, { a: { y: 2 } })).toEqual({ a: { x: 1, y: 2 } });
  });

  test('overwrites primitive properties from the source', () => {
    expect(objUtils.deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  test('returns source when target is not an object', () => {
    expect(objUtils.deepMerge(null, { a: 1 })).toEqual({ a: 1 });
  });

  test('returns target when source is not an object', () => {
    expect(objUtils.deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });

  test('aligns keys across array-of-object entries by filling missing keys with null', () => {
    const target = [{ a: 1 }];
    const source = [{ b: 2 }, { c: 3 }];
    const merged = objUtils.deepMerge(target, source);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ a: 1, b: 2, c: null });
    expect(merged[1]).toEqual({ a: null, b: null, c: 3 });
  });
});

describe('objUtils.fillByTemplate', () => {
  test('copies source values into matching template keys, keeping template defaults for absent ones', () => {
    const template = { name: '', age: 0 };
    const source = { name: 'John' };
    expect(objUtils.fillByTemplate(template, source)).toEqual({ name: 'John', age: 0 });
  });

  test('applies the first template entry to every source array item', () => {
    const template = [{ id: 0, name: '' }];
    const source = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    expect(objUtils.fillByTemplate(template, source)).toEqual(source);
  });

  test('keeps the template value untouched for keys listed in preserveKeys', () => {
    const template = { type: 'default', value: 0 };
    const source = { type: 'override', value: 42 };
    expect(objUtils.fillByTemplate(template, source, ['type']))
      .toEqual({ type: 'default', value: 42 });
  });
});

describe('objUtils.setValueByJsonPath', () => {
  test('assigns a value at a nested JSONPath, creating intermediate objects', () => {
    expect(objUtils.setValueByJsonPath({}, '$.a.b', 1)).toEqual({ a: { b: 1 } });
  });

  test('replaces the whole object when the path is "$"', () => {
    expect(objUtils.setValueByJsonPath({ a: 1 }, '$', { b: 2 })).toEqual({ b: 2 });
  });

  test('returns the original object when the path is not a valid JSONPath', () => {
    const obj = { a: 1 };
    expect(objUtils.setValueByJsonPath(obj, 'invalid', 'x')).toBe(obj);
  });
});

describe('objUtils.parseStringLiteral', () => {
  test('parses numeric and boolean string literals inside objects', () => {
    expect(objUtils.parseStringLiteral({ a: '1', b: 'true', c: '1.5' }))
      .toEqual({ a: 1, b: true, c: 1.5 });
  });

  test('parses JSON string values into structured data', () => {
    expect(objUtils.parseStringLiteral({ a: '{"x":1}' })).toEqual({ a: { x: 1 } });
  });

  test('leaves non-literal strings unchanged', () => {
    expect(objUtils.parseStringLiteral({ a: 'hello' })).toEqual({ a: 'hello' });
  });

  test('recurses into nested arrays', () => {
    expect(objUtils.parseStringLiteral([{ n: '2' }])).toEqual([{ n: 2 }]);
  });
});

describe('objUtils.getValuesAtPath', () => {
  test('returns the value at a simple dot path', () => {
    expect(objUtils.getValuesAtPath({ a: { b: 1 } }, 'a.b')).toEqual([1]);
  });

  test('expands "[]" segments and concatenates values across array elements', () => {
    const obj = { items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
    expect(objUtils.getValuesAtPath(obj, 'items[].v')).toEqual([1, 2, 3]);
  });

  test('returns an empty array when an intermediate segment is missing', () => {
    expect(objUtils.getValuesAtPath({ a: 1 }, 'a.b.c')).toEqual([]);
  });
});

describe('objUtils.getFirstValueByKey', () => {
  test('returns the first value with the given key in DFS order', () => {
    const obj = { x: { target: 1 }, y: { target: 2 } };
    expect(objUtils.getFirstValueByKey(obj, 'target')).toBe(1);
  });

  test('returns undefined when the key is not present', () => {
    expect(objUtils.getFirstValueByKey({ a: 1 }, 'missing')).toBeUndefined();
  });

  test('does not recurse infinitely on circular references', () => {
    const obj = { a: 1 };
    obj.self = obj;
    expect(objUtils.getFirstValueByKey(obj, 'missing')).toBeUndefined();
  });
});

describe('objUtils.cloneWithPrototype', () => {
  test('preserves the prototype chain of class instances', () => {
    class Foo {
      constructor() {
        this.x = 1;
      }

      getX() {
        return this.x;
      }
    }
    const clone = objUtils.cloneWithPrototype(new Foo());
    expect(clone).toBeInstanceOf(Foo);
    expect(clone.getX()).toBe(1);
  });

  test('returns the input unchanged for primitive values', () => {
    expect(objUtils.cloneWithPrototype('x')).toBe('x');
  });
});
