import { describe, expect, test } from 'vitest';
import { jsonAstUtils } from './jsonAstUtils';

describe('jsonAstUtils.buildAst', () => {
  test('parses an object node with key/value children and full location range', () => {
    const ast = jsonAstUtils.buildAst('{"a":1}');
    expect(ast.type).toBe('Object');
    expect(ast.children).toHaveLength(1);
    expect(ast.loc).toEqual({ start: 0, end: 7 });
  });

  test('parses string, number, and literal values with their locations', () => {
    const ast = jsonAstUtils.buildAst('{"s":"x","n":1.5,"b":true,"z":null}');
    const types = ast.children.map(c => c.value.type);
    expect(types).toEqual(['String', 'Number', 'Literal', 'Literal']);
  });

  test('parses array elements into child nodes', () => {
    const ast = jsonAstUtils.buildAst('[1,2,3]');
    expect(ast.type).toBe('Array');
    expect(ast.children).toHaveLength(3);
  });

  test('returns an Error node when the input is not valid JSON', () => {
    expect(jsonAstUtils.buildAst('garbage').type).toBe('Error');
  });
});

describe('jsonAstUtils.findLocationByPath', () => {
  const ast = jsonAstUtils.buildAst('{"a":{"b":[10,20]}}');

  test('returns the located node and its loc for an object property path', () => {
    const result = jsonAstUtils.findLocationByPath(ast, ['a', 'b']);
    expect(result.node.type).toBe('Array');
    expect(result.loc).toEqual(result.node.loc);
  });

  test('returns the key location when locateKey is true', () => {
    const result = jsonAstUtils.findLocationByPath(ast, ['a'], { locateKey: true });
    expect(result.node.type).toBe('String');
    expect(result.node.value).toBe('a');
  });

  test('returns the value location when locateValue is true', () => {
    const result = jsonAstUtils.findLocationByPath(ast, ['a'], { locateValue: true });
    expect(result.node.type).toBe('Object');
  });

  test('navigates array children via numeric path segments', () => {
    const result = jsonAstUtils.findLocationByPath(ast, ['a', 'b', '1']);
    expect(result.node.value).toBe(20);
  });

  test('returns null when the path does not resolve', () => {
    expect(jsonAstUtils.findLocationByPath(ast, ['missing'])).toBeNull();
  });
});

describe('jsonAstUtils.findPropertyNodeByKey', () => {
  test('finds a property at the top level of an object node', () => {
    const ast = jsonAstUtils.buildAst('{"target":1}');
    expect(jsonAstUtils.findPropertyNodeByKey(ast, 'target').key.value).toBe('target');
  });

  test('recurses into nested objects to find the property', () => {
    const ast = jsonAstUtils.buildAst('{"a":{"target":1}}');
    expect(jsonAstUtils.findPropertyNodeByKey(ast, 'target').key.value).toBe('target');
  });

  test('walks into array element objects', () => {
    const ast = jsonAstUtils.buildAst('{"arr":[{"target":1}]}');
    expect(jsonAstUtils.findPropertyNodeByKey(ast, 'target').key.value).toBe('target');
  });

  test('returns null when the key is not found', () => {
    const ast = jsonAstUtils.buildAst('{"a":1}');
    expect(jsonAstUtils.findPropertyNodeByKey(ast, 'missing')).toBeNull();
  });
});

describe('jsonAstUtils.getOffsetRange', () => {
  test('returns a single-character range at the property location for a required-keyword error', () => {
    const range = jsonAstUtils.getOffsetRange('{"a":1}', {
      instancePath: '/a',
      keyword: 'required',
      params: { errors: [] },
      message: '',
    });
    expect(range.to - range.from).toBe(1);
  });

  test('falls back to {from: 0, to: 1} when the instance path cannot be located', () => {
    expect(jsonAstUtils.getOffsetRange('{"a":1}', {
      instancePath: '/missing',
      keyword: 'type',
      params: { errors: [] },
      message: 'something',
    })).toEqual({ from: 0, to: 1 });
  });
});
