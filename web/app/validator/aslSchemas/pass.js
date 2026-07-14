import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/pass`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Pass'],
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
    Parameters: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
    },
    Result: {
      $ref: 'common#/definitions/asl_jsonpath_binding',
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
    oneOf: 'you must specify either \'Next\' or \'End\', but not both',
    additionalProperties: 'field is not supported',
  },
};
