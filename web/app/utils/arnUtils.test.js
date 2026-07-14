import { describe, expect, test } from 'vitest';
import arnUtils from './arnUtils';

const EXECUTION_ARN = 'arn:aws:states:us-west-2:123456789012:execution:my-workflow:abc-123';
const LAMBDA_ARN = 'arn:aws:lambda:us-west-2:123456789012:function:my-func';
const STATE_MACHINE_ARN = 'arn:aws:states:us-west-2:123456789012:stateMachine:my-workflow';

describe('arnUtils.getWorkflowId', () => {
  test('extracts the workflow id from an execution ARN', () => {
    expect(arnUtils.getWorkflowId(EXECUTION_ARN)).toBe('my-workflow');
  });

  test('returns null when the ARN has no execution segment', () => {
    expect(arnUtils.getWorkflowId(STATE_MACHINE_ARN)).toBeNull();
  });

  test.each([null, undefined, ''])('returns null for falsy input %j', (input) => {
    expect(arnUtils.getWorkflowId(input)).toBeNull();
  });
});

describe('arnUtils.toUrl', () => {
  test('builds a state machine console URL', () => {
    expect(arnUtils.toUrl(STATE_MACHINE_ARN))
      .toBe(`https://us-west-2.console.aws.amazon.com/states/home?region=us-west-2#/statemachines/view/${STATE_MACHINE_ARN}`);
  });

  test('builds an execution console URL', () => {
    expect(arnUtils.toUrl(EXECUTION_ARN))
      .toBe(`https://us-west-2.console.aws.amazon.com/states/home?region=us-west-2#/v2/executions/details/${EXECUTION_ARN}`);
  });

  test('builds a Lambda function console URL', () => {
    expect(arnUtils.toUrl(LAMBDA_ARN))
      .toBe('https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/my-func');
  });

  test('builds a Lambda alias console URL', () => {
    expect(arnUtils.toUrl('arn:aws:lambda:us-west-2:123456789012:function:my-func:prod'))
      .toBe('https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/my-func/aliases/prod');
  });

  test('builds a Lambda version console URL', () => {
    expect(arnUtils.toUrl('arn:aws:lambda:us-west-2:123456789012:function:my-func:42'))
      .toBe('https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/my-func/versions/42');
  });

  test('builds a Lambda $LATEST console URL', () => {
    expect(arnUtils.toUrl('arn:aws:lambda:us-west-2:123456789012:function:my-func:$LATEST'))
      .toBe('https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/my-func/versions/$LATEST');
  });

  test.each([null, undefined, ''])('returns an empty string for falsy input %j', (input) => {
    expect(arnUtils.toUrl(input)).toBe('');
  });

  test.each([
    'not-an-arn',
    'arn:aws:s3:::my-bucket',
    'arn:aws:dynamodb:us-east-1:123456789012:table/foo',
    'arn:aws:lambda:us-west-2:123456789012:event-source-mapping:abc',
  ])('returns an empty string for unsupported ARN input %j', (input) => {
    expect(arnUtils.toUrl(input)).toBe('');
  });
});

describe('arnUtils.isArn', () => {
  test.each([
    'arn:aws:states:us-west-2:123456789012:execution:my-workflow:abc',
    'arn:aws:lambda:us-east-1:123456789012:function:my-func',
    'arn:aws-cn:states:cn-north-1:123456789012:stateMachine:foo',
    'arn:aws:states:::lambda:invoke',
    'arn:aws:states:::sqs:sendMessage',
  ])('accepts %j as a valid ARN', (input) => {
    expect(arnUtils.isArn(input)).toBe(true);
  });

  test.each([
    '',
    'not-an-arn',
    'arn:aws:s3:::my-bucket',
    'arn:aws::us-east-1:123456789012:resource',
  ])('rejects %j as not an ARN', (input) => {
    expect(arnUtils.isArn(input)).toBe(false);
  });

  test.each([null, undefined, 123, {}, []])('rejects non-string input %j', (input) => {
    expect(arnUtils.isArn(input)).toBe(false);
  });
});

describe('arnUtils.isLambdaArn', () => {
  test.each([
    'arn:aws:lambda:us-east-1:123456789012:function:my-func',
    'arn:aws:lambda:us-east-1:123456789012:function:billing.worker',
    'arn:aws:lambda:ap-northeast-1:123456789012:function:image.resizer:prod',
    'arn:aws-cn:lambda:cn-north-1:123456789012:function:etl.v2',
    'arn:aws-cn:lambda:cn-north-1:123456789012:function:my_func',
    'arn:aws-us-gov:lambda:us-gov-west-1:123456789012:function:my-func:$LATEST',
    'arn:aws-us-gov:lambda:us-gov-west-1:123456789012:function:my-func:$LATEST.PUBLISHED',
    'arn:aws-iso:lambda:us-iso-east-1:123456789012:function:my-func',
    'arn:aws-iso-b:lambda:us-isob-east-1:123456789012:function:my-func',
    'arn:aws:lambda:us-east-1:123456789012:function:my-func:prod',
    'arn:aws:lambda:us-east-1:123456789012:function:my-func:12',
  ])('accepts %j as a valid Lambda ARN', (input) => {
    expect(arnUtils.isLambdaArn(input)).toBe(true);
  });

  test.each([
    '',
    'not-an-arn',
    'arn:aws:states:us-east-1:123456789012:stateMachine:foo',
    'arn:aws:lambda:us-east-1:123456789012:event-source-mapping:abc',
    'arn:aws:lambda:us-east-1:123456789012:function:',
    'arn:aws:lambda:us-east-1:123456789012:function:my-func:',
    'arn:aws:lambda:us-east-1:123456789012:function:my-func:prod.v1',
    'arn:aws:lambda:us-east-1:123456789012:function:my-func:$LATEST.PUBLISHED.EXTRA',
    'arn:aws:lambda:foo:123456789012:function:my-func',
    'arn:aws:lambda:us-east:123456789012:function:my-func',
    'arn:aws:lambda:us-east-01:123456789012:function:my-func',
    'arn:aws:lambda:us-east-1-extra:123456789012:function:my-func',
    'arn:aws:lambda:us-east-1:12345678901:function:my-func',
  ])('rejects %j as not a Lambda ARN', (input) => {
    expect(arnUtils.isLambdaArn(input)).toBe(false);
  });

  test.each([null, undefined, 123, {}, []])('rejects non-string input %j', (input) => {
    expect(arnUtils.isLambdaArn(input)).toBe(false);
  });
});
