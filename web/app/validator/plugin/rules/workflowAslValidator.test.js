import { describe, expect, test } from 'vitest';
import workflowAslValidator from './workflowAslValidator';

describe('workflowAslValidator', () => {
  test('should pass with valid ASL JSON', () => {
    const validJson = JSON.stringify({
      StartAt: 'HelloWorld',
      States: {
        HelloWorld: {
          Type: 'Pass',
          End: true,
        },
      },
    });
    expect(workflowAslValidator()(validJson)).toBe(true);
  });

  test('should fail with invalid ASL JSON', () => {
    const invalidJson = JSON.stringify({
      States: {
        HelloWorld: {
          Type: 'Pass',
          End: true,
        },
      },
    });
    expect(workflowAslValidator()(invalidJson)).toBe(false);
  });

  test('should fail with duplicated keys', () => {
    const duplicatedKeyJson = `{
      "StartAt": "HelloWorld",
      "States": {
        "HelloWorld": {
          "Type": "Pass",
          "End": true
        },
        "HelloWorld": {
          "Type": "Fail",
          "End": true
        }
      }
    }`;
    expect(workflowAslValidator()(duplicatedKeyJson)).toBe(false);
  });

  test('should fail if there are unreachable states', () => {
    const json = JSON.stringify({
      StartAt: 'HelloWorld',
      States: {
        HelloWorld: {
          Type: 'Pass',
          End: true,
        },
        UnusedState: {
          Type: 'Pass',
          End: true,
        },
      },
    });
    expect(workflowAslValidator()(json)).toBe(false);
  });

  test('should fail if a state targets a non-existent state', () => {
    const json = JSON.stringify({
      StartAt: 'HelloWorld',
      States: {
        HelloWorld: {
          Type: 'Pass',
          Next: 'NotExist',
        },
      },
    });
    expect(workflowAslValidator()(json)).toBe(false);
  });

  test('should pass if all states are reachable and all targets exist', () => {
    const json = JSON.stringify({
      StartAt: 'HelloWorld',
      States: {
        HelloWorld: {
          Type: 'Pass',
          Next: 'Second',
        },
        Second: {
          Type: 'Pass',
          End: true,
        },
      },
    });
    expect(workflowAslValidator()(json)).toBe(true);
  });
});
