import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/parallel`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Parallel'],
    },
    Parameters: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
    },
    ResultSelector: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
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
    Branches: {
      type: 'array',
      minItems: 1,
      items: {
        $ref: 'base-state-machine#',
      },
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
  required: ['Type', 'Branches'],
  additionalProperties: false,
  errorMessage: {
    oneOf: 'you must specify either \'Next\' or \'End\', but not both',
    additionalProperties: 'Field is not supported.',
  },
};
