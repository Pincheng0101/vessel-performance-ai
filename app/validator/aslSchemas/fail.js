import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/fail`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Fail'],
    },
    Comment: {
      type: 'string',
    },
    Cause: {
      type: 'string',
    },
    Error: {
      type: 'string',
    },
  },
  required: ['Type'],
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'field is not supported',
  },
};
