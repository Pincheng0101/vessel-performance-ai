import { describe, expect, test } from 'vitest';
import lambdaArn from './lambdaArn';

const validate = lambdaArn();

describe('lambdaArn', () => {
  test('should pass with valid Lambda ARN input', () => {
    expect(validate('arn:aws:lambda:us-east-1:123456789012:function:my-func')).toBe(true);
    expect(validate('arn:aws:lambda:us-east-1:123456789012:function:billing.worker')).toBe(true);
    expect(validate('arn:aws:lambda:us-east-1:123456789012:function:my-func:prod')).toBe(true);
    expect(validate('arn:aws-us-gov:lambda:us-gov-west-1:123456789012:function:my-func:$LATEST.PUBLISHED')).toBe(true);
  });

  test('should fail with invalid input', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate('foo')).toBe(false);
    expect(validate('arn:aws:states:us-east-1:123456789012:stateMachine:foo')).toBe(false);
  });
});
