import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/common`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  definitions: {
    asl_arn: {
      type: 'string',
      format: 'arn',
      errorMessage: 'invalid ARN format',
    },
    asl_path: {
      type: ['string', 'null'],
      format: 'jsonpath',
      errorMessage: 'invalid JSONPath format',
    },
    asl_jsonpath_binding: {
      type: ['object', 'null'],
      jsonPathBinding: true,
      errorMessage: 'invalid AWS Step Functions JSONPath binding',
    },
  },
};
