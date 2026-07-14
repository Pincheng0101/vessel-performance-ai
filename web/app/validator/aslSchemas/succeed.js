import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/succeed`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Type: {
      type: 'string',
      enum: ['Succeed'],
    },
    Comment: {
      type: 'string',
    },
  },
  required: ['Type'],
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'field is not supported',
  },
};
