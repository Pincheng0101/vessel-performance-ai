import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/wait`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Wait'],
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
    Seconds: {
      type: 'number',
      minimum: 1,
    },
    Timestamp: {
      type: 'string',
    },
    SecondsPath: {
      $ref: 'common#/definitions/asl_path',
    },
    TimestampPath: {
      $ref: 'common#/definitions/asl_path',
    },
  },
  allOf: [
    {
      if: {
        required: ['Next', 'End'],
      },
      then: {
        not: {},
        errorMessage: 'you must specify either \'Next\' or \'End\', but not both',
      },
    },
    {
      if: {
        required: ['Seconds', 'Timestamp'],
      },
      then: {
        not: {},
        errorMessage: 'you must not specify both \'Seconds\' and \'Timestamp\'',
      },
    },
  ],
  required: ['Type'],
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'field is not supported',
  },
};
