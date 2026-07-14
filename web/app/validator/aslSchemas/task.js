import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/task`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Task'],
    },
    Next: {
      type: 'string',
      minLength: 1,
    },
    End: {
      type: 'boolean',
      enum: [true],
    },
    Comment: {
      type: 'string',
    },
    OutputPath: {
      $ref: 'common#/definitions/asl_path',
    },
    InputPath: {
      $ref: 'common#/definitions/asl_path',
    },
    Resource: {
      $ref: 'common#/definitions/asl_arn',
    },
    ResultPath: {
      $ref: 'common#/definitions/asl_path',
    },
    Retry: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ErrorEquals: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          IntervalSeconds: {
            type: 'number',
            minimum: 0,
          },
          MaxAttempts: {
            type: 'number',
            minimum: 0,
          },
          MaxDelaySeconds: {
            type: 'number',
            minimum: 0,
          },
          JitterStrategy: {
            type: 'string',
            minLength: 1,
            enum: ['FULL', 'NONE'],
            errorMessage: {
              enum: 'must be either \'FULL\' or \'NONE\'',
            },
          },
          BackoffRate: {
            type: 'number',
            minimum: 0,
          },
        },
        required: ['ErrorEquals'],
        additionalProperties: false,
        errorMessage: {
          additionalProperties: 'field is not supported',
        },
      },
    },
    Catch: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ErrorEquals: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          Next: {
            type: 'string',
          },
          ResultPath: {
            $ref: 'common#/definitions/asl_path',
          },
        },
        required: ['ErrorEquals', 'Next'],
        additionalProperties: false,
        errorMessage: {
          additionalProperties: 'field is not supported',
        },
      },
    },
    ResultSelector: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
    },
    Parameters: {
      type: 'object',
      required: ['FunctionName', 'Payload'],
      properties: {
        FunctionName: {
          type: 'string',
          minLength: 1,
        },
        Payload: {
          type: 'object',
          properties: {
            action_type: {
              type: 'string',
              minLength: 1,
            },
          },
        },
      },
    },
  },
  oneOf: [
    {
      required: ['End'],
      not: { required: ['Next'] },
    },
    {
      required: ['Next'],
      not: { required: ['End'] },
    },
  ],
  errorMessage: {
    oneOf: 'you must specify either \'Next\' or \'End\', but not both',
  },
  required: ['Type', 'Resource'],
  additionalProperties: true,
};
