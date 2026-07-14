const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        errors: {
          type: ['array', 'null'],
          items: {
            type: 'string',
          },
        },
        columns: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        rows: {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: ['string', 'null'],
            },
          },
        },
        query_execution_id: {
          type: 'string',
        },
        truncated: {
          type: 'boolean',
        },
      },
      required: ['columns', 'rows', 'query_execution_id'],
    },
  },
});

const DefaultParams = Object.freeze({
  MAX_ROWS: {
    min: 1,
    max: 10000,
    step: 1,
    default: 10000,
  },
  QUERY: '-- Replace table_name with your Athena table.\nSELECT *\nFROM "table_name"\nLIMIT 100;',
  WAIT_TIMEOUT: {
    min: 1,
    max: 870,
    step: 1,
    default: 300,
  },
  READ_ONLY: true,
});

const ExecutionSettingType = Object.freeze({
  WORKGROUP: {
    value: 'workgroup',
    i18nTitle: '__fieldWorkgroup',
    i18nSubtitle: '__subtitleAgentAthenaExecutionSettingTypeWorkgroup',
  },
  OUTPUT_LOCATION: {
    value: 'outputLocation',
    i18nTitle: '__fieldOutputLocation',
    i18nSubtitle: '__subtitleAgentAthenaExecutionSettingTypeOutputLocation',
  },
});

export {
  ActionExecutionParams,
  DefaultParams,
  ExecutionSettingType,
};
