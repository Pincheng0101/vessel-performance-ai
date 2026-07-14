import { JsonSchemaConstant } from '~/codemirror/constants';

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/state`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['Type'],
  properties: {
    Type: {
      type: 'string',
      minLength: 1,
      enum: ['Pass', 'Succeed', 'Fail', 'Task', 'Choice', 'Wait', 'Parallel', 'Map'],
      errorMessage: {
        enum: 'value is not accepted. Valid values: \'Pass\', \'Succeed\', \'Fail\', \'Task\', \'Choice\', \'Wait\', \'Parallel\', \'Map\'',
      },
    },
  },
  allOf: [
    {
      if: {
        required: ['Type'],
        properties: { Type: { const: 'Succeed' } },
      },
      then: {
        $ref: 'succeed#',
      },
    },
    {
      if: {
        required: ['Type'],
        properties: { Type: { const: 'Fail' } },
      },
      then: {
        $ref: 'fail#',
      },
    },
    {
      if: {
        required: ['Type'],
        allOf: [
          { properties: { Type: { const: 'Task' } } },
          { not: { properties: { Type: { enum: ['Succeed', 'Fail', 'Parallel', 'Choice', 'Map', 'Pass', 'Wait'] } } } },
        ],
      },
      then: {
        $ref: 'task#',
      },
    },
    {
      if: {
        required: ['Type'],
        allOf: [
          { properties: { Type: { const: 'Choice' } } },
          { not: { properties: { Type: { enum: ['Succeed', 'Fail', 'Task', 'Parallel', 'Map', 'Pass', 'Wait'] } } } },
        ],
      },
      then: {
        $ref: 'choice#',
      },
    },
    {
      if: {
        required: ['Type'],
        allOf: [
          { properties: { Type: { const: 'Parallel' } } },
          { not: { properties: { Type: { enum: ['Succeed', 'Fail', 'Task', 'Choice', 'Map', 'Pass', 'Wait'] } } } },
        ],
      },
      then: {
        $ref: 'parallel#',
      },
    },
    {
      if: {
        required: ['Type'],
        allOf: [
          { properties: { Type: { const: 'Pass' } } },
          { not: { properties: { Type: { enum: ['Succeed', 'Fail', 'Task', 'Parallel', 'Wait', 'Map', 'Choice'] } } } },
        ],
      },
      then: {
        $ref: 'pass#',
      },
    },
    {
      if: {
        required: ['Type'],
        allOf: [
          { properties: { Type: { const: 'Wait' } } },
          { not: { properties: { Type: { enum: ['Succeed', 'Fail', 'Task', 'Parallel', 'Map', 'Pass', 'Choice'] } } } },
        ],
      },
      then: {
        $ref: 'wait#',
      },
    },
    {
      if: {
        required: ['Type'],
        allOf: [
          { properties: { Type: { const: 'Map' } } },
          { not: { properties: { Type: { enum: ['Succeed', 'Fail', 'Task', 'Parallel', 'Wait', 'Pass', 'Choice'] } } } },
        ],
      },
      then: {
        $ref: 'map#',
      },
    },
  ],
};
