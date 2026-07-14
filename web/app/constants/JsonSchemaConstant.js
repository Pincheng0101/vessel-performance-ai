const DataType = Object.freeze({
  STRING: {
    i18nTitle: '__fieldJsonSchemaDataTypeString',
    value: 'string',
    icon: 'mdi-text',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeString',
  },
  NUMBER: {
    i18nTitle: '__fieldJsonSchemaDataTypeNumber',
    value: 'number',
    icon: 'mdi-numeric',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeNumber',
  },
  INTEGER: {
    i18nTitle: '__fieldJsonSchemaDataTypeInteger',
    value: 'integer',
    icon: 'mdi-numeric',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeInteger',
  },
  BOOLEAN: {
    i18nTitle: '__fieldJsonSchemaDataTypeBoolean',
    value: 'boolean',
    icon: 'mdi-check-circle-outline',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeBoolean',
  },
  ARRAY: {
    i18nTitle: '__fieldJsonSchemaDataTypeArray',
    value: 'array',
    icon: 'mdi-format-list-bulleted',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeArray',
  },
  OBJECT: {
    i18nTitle: '__fieldJsonSchemaDataTypeObject',
    value: 'object',
    icon: 'mdi-cube',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeObject',
  },
  FILE: {
    i18nTitle: '__fieldJsonSchemaDataTypeFile',
    value: 'file',
    icon: 'mdi-file-document',
    i18nSubtitle: '__subtitleJsonSchemaDataTypeFile',
  },
  NULL: {
    i18nTitle: '__fieldJsonSchemaDataTypeNull',
    value: 'null',
    icon: '',
    i18nSubtitle: '',
  },
});

const Base = Object.freeze({
  DEFAULT_SCHEMA: {
    type: 'object',
    properties: {
      my_property: {
        type: 'string',
      },
    },
    required: [
      'my_property',
    ],
  },
  META_SCHEMA: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: [
          'object',
        ],
      },
      properties: {
        type: 'object',
        additionalProperties: {
          $ref: '#/definitions/fieldDefinition',
        },
      },
    },
    required: ['type', 'properties'],
    definitions: {
      fieldDefinition: {
        type: 'object',
        properties: {
          _order: {
            type: 'integer',
          },
          type: {
            if: {
              type: 'string',
            },
            then: {
              enum: Object.values(DataType).map(({ value }) => value),
            },
            else: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(DataType).map(({ value }) => value),
              },
            },
          },
          properties: {
            type: 'object',
            additionalProperties: {
              $ref: '#/definitions/fieldDefinition',
            },
          },
        },
        required: ['type'],
      },
    },
  },
});

export {
  Base,
  DataType,
};
