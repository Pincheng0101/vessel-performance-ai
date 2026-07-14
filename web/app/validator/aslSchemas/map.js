import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/map`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Map'],
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
    ResultPath: {
      $ref: 'common#/definitions/asl_path',
    },
    ItemsPath: {
      $ref: 'common#/definitions/asl_path',
    },
    MaxConcurrency: {
      type: 'number',
      minimum: 0,
    },
    ItemProcessor: {
      type: 'object',
      allOf: [{ $ref: 'base-state-machine#' }],
      properties: {
        ProcessorConfig: {
          type: 'object',
          properties: {
            Mode: {
              type: 'string',
              minLength: 1,
              enum: ['INLINE'],
            },
          },
          required: ['Mode'],
        },
      },
      required: ['ProcessorConfig'],
    },
    ItemSelector: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
    },
    ResultSelector: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
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
          BackoffRate: {
            type: 'number',
            minimum: 0,
          },
        },
        required: ['ErrorEquals'],
        additionalProperties: false,
        errorMessage: {
          additionalProperties: 'Field is not supported.',
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
          additionalProperties: 'Field is not supported.',
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
  required: ['Type'],
  additionalProperties: false,
  errorMessage: {
    oneOf: 'You must specify either \'Next\' or \'End\', but not both.',
    additionalProperties: 'Field is not supported.',
  },
};
