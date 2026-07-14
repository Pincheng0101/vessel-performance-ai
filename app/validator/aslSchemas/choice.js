import { JsonSchemaConstant } from '~/codemirror/constants';

const ConditionRequiredAnyOf = [
  { required: ['Variable'] },
  { required: ['And'] },
  { required: ['Or'] },
  { required: ['Not'] },
  { required: ['IsNull'] },
  { required: ['IsPresent'] },
  { required: ['BooleanEquals'] },
  { required: ['BooleanEqualsPath'] },
  { required: ['IsBoolean'] },
  { required: ['NumericEquals'] },
  { required: ['NumericEqualsPath'] },
  { required: ['NumericGreaterThan'] },
  { required: ['NumericGreaterThanPath'] },
  { required: ['NumericGreaterThanEquals'] },
  { required: ['NumericGreaterThanEqualsPath'] },
  { required: ['NumericLessThan'] },
  { required: ['NumericLessThanPath'] },
  { required: ['NumericLessThanEquals'] },
  { required: ['NumericLessThanEqualsPath'] },
  { required: ['IsNumeric'] },
  { required: ['StringEquals'] },
  { required: ['StringEqualsPath'] },
  { required: ['StringGreaterThan'] },
  { required: ['StringGreaterThanPath'] },
  { required: ['StringGreaterThanEquals'] },
  { required: ['StringGreaterThanEqualsPath'] },
  { required: ['StringLessThan'] },
  { required: ['StringLessThanPath'] },
  { required: ['StringLessThanEquals'] },
  { required: ['StringLessThanEqualsPath'] },
  { required: ['StringMatches'] },
  { required: ['IsString'] },
  { required: ['TimestampEquals'] },
  { required: ['TimestampEqualsPath'] },
  { required: ['TimestampGreaterThan'] },
  { required: ['TimestampGreaterThanPath'] },
  { required: ['TimestampGreaterThanEquals'] },
  { required: ['TimestampGreaterThanEqualsPath'] },
  { required: ['TimestampLessThan'] },
  { required: ['TimestampLessThanPath'] },
  { required: ['TimestampLessThanEquals'] },
  { required: ['TimestampLessThanEqualsPath'] },
  { required: ['IsTimestamp'] },
];

const ConditionProperties = {
  Variable: { $ref: 'common#/definitions/asl_path' },
  Not: { $ref: '#/$defs/ConditionObject' },
  And: { type: 'array', items: { $ref: '#/$defs/ConditionObject' } },
  Or: { type: 'array', items: { $ref: '#/$defs/ConditionObject' } },
  IsNull: { type: 'boolean' },
  IsPresent: { type: 'boolean' },
  BooleanEquals: { type: 'boolean' },
  BooleanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  IsBoolean: { type: 'boolean' },
  NumericEquals: { type: 'number' },
  NumericEqualsPath: { $ref: 'common#/definitions/asl_path' },
  NumericGreaterThan: { type: 'number' },
  NumericGreaterThanPath: { $ref: 'common#/definitions/asl_path' },
  NumericGreaterThanEquals: { type: 'number' },
  NumericGreaterThanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  NumericLessThan: { type: 'number' },
  NumericLessThanPath: { $ref: 'common#/definitions/asl_path' },
  NumericLessThanEquals: { type: 'number' },
  NumericLessThanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  IsNumeric: { type: 'boolean' },
  StringEquals: { type: 'string' },
  StringEqualsPath: { $ref: 'common#/definitions/asl_path' },
  StringGreaterThan: { type: 'string' },
  StringGreaterThanPath: { $ref: 'common#/definitions/asl_path' },
  StringGreaterThanEquals: { type: 'string' },
  StringGreaterThanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  StringLessThan: { type: 'string' },
  StringLessThanPath: { $ref: 'common#/definitions/asl_path' },
  StringLessThanEquals: { type: 'string' },
  StringLessThanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  StringMatches: { type: 'string' },
  IsString: { type: 'boolean' },
  TimestampEquals: { type: 'string' },
  TimestampEqualsPath: { $ref: 'common#/definitions/asl_path' },
  TimestampGreaterThan: { type: 'string' },
  TimestampGreaterThanPath: { $ref: 'common#/definitions/asl_path' },
  TimestampGreaterThanEquals: { type: 'string' },
  TimestampGreaterThanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  TimestampLessThan: { type: 'string' },
  TimestampLessThanPath: { $ref: 'common#/definitions/asl_path' },
  TimestampLessThanEquals: { type: 'string' },
  TimestampLessThanEqualsPath: { $ref: 'common#/definitions/asl_path' },
  IsTimestamp: { type: 'boolean' },
};

const ConditionObjectSchema = {
  type: 'object',
  properties: ConditionProperties,
  allOf: [
    {
      if: {
        required: ['Variable'],
        propertyNames: { enum: ['Variable'] },
      },
      then: {
        not: {},
        errorMessage: 'missing property \'StringEquals\'',
      },
    },
    {
      if: {
        not: {
          anyOf: [
            { required: ['Not'] },
            { required: ['And'] },
            { required: ['Or'] },
            { required: ['Variable'] },
          ],
        },
      },
      then: {
        not: {},
        errorMessage: 'missing property \'Variable\'',
      },
    },
  ],
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'field is not supported',
  },
};

export default {
  $id: `${JsonSchemaConstant.SchemaIdPrefix}/choice`,
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  $defs: {
    ConditionObject: ConditionObjectSchema,
  },
  properties: {
    Type: {
      type: 'string',
      enum: ['Choice'],
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
    Choices: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['Next'],
        properties: {
          Next: {
            type: 'string',
            minLength: 1,
          },
          ...ConditionProperties,
        },
        allOf: [
          {
            if: {
              anyOf: [
                { required: ['Not', 'And'] },
                { required: ['Not', 'Or'] },
                { required: ['And', 'Or'] },
                { required: ['Not', 'And', 'Or'] },
              ],
            },
            then: {
              not: {},
              errorMessage: 'each Choice Rule can only have one comparison operator',
            },
          },
          {
            if: {
              required: ['Next'],
              not: {
                anyOf: ConditionRequiredAnyOf,
              },
            },
            then: {
              not: {},
              errorMessage: {
                not: 'missing property \'Condition\'',
              },
            },
          },
          {
            if: {
              required: ['Next'],
              anyOf: ConditionRequiredAnyOf,
            },
            then: {
              allOf: [
                {
                  if: {
                    not: {
                      anyOf: [
                        { required: ['And'] },
                        { required: ['Or'] },
                        { required: ['Not'] },
                      ],
                    },
                  },
                  then: {
                    required: ['Variable'],
                    errorMessage: 'missing property \'Variable\'',
                  },
                },
                {
                  if: {
                    required: ['Next', 'Variable'],
                    properties: {
                      Next: {},
                      Variable: {},
                    },
                    propertyNames: {
                      enum: ['Next', 'Variable'],
                    },
                  },
                  then: {
                    not: {},
                    errorMessage: 'missing property \'StringEquals\'',
                  },
                },
              ],
            },
          },
        ],
        additionalProperties: false,
        errorMessage: {
          additionalProperties: 'field is not supported',
        },
      },
    },
    Default: {
      type: 'string',
    },
  },
  required: ['Type', 'Choices'],
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'field is not supported',
  },
};
