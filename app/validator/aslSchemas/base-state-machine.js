import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/base-state-machine`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    Comment: {
      type: 'string',
    },
    StartAt: {
      type: 'string',
      minLength: 1,
    },
    States: {
      type: 'object',
      patternProperties: {
        '^.{1,80}$': {
          $ref: 'state#',
        },
      },
      additionalProperties: true,
    },
  },
  required: ['StartAt', 'States'],
};
