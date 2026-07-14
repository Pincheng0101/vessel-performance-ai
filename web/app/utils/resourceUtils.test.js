import { describe, expect, test } from 'vitest';
import resourceUtils from './resourceUtils';

describe('resourceUtils.getUrl', () => {
  test('returns a root-level path for workflow type', () => {
    expect(resourceUtils.getUrl('workflow')).toBe('/workflows');
  });

  test('returns a root-level path for agent type', () => {
    expect(resourceUtils.getUrl('agent')).toBe('/agents');
  });

  test('prefixes other resource types with /resources', () => {
    expect(resourceUtils.getUrl('llm')).toBe('/resources/llms');
  });

  test('appends the id segment when an id is provided', () => {
    expect(resourceUtils.getUrl('workflow', 'wf-1')).toBe('/workflows/wf-1');
    expect(resourceUtils.getUrl('llm', 'llm-1')).toBe('/resources/llms/llm-1');
  });
});
