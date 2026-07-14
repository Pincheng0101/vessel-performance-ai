const Base = Object.freeze({
  FETCH_INTERVAL: 5000,
});

const RetryParams = Object.freeze({
  ATTEMPTS: {
    default: 5,
  },
  TEMPERATURE_DIFF: {
    default: 0.1,
  },
});

const ExternalMemoryParams = Object.freeze({
  URL: 'https://',
  STATE_INPUT_DATA: '$',
  STATE_INPUT_URL: '$',
  EXTERNAL_MEMORY_DATA: {
    default: {
      'id.$': '$.external_memory_id',
      'type': 'external_memory',
      'jsonpath': '$.external_memory_path',
    },
    jsonSchema: {
      type: 'object',
      properties: {
        'id.$': {
          type: 'string',
        },
        'type': {
          type: 'string',
        },
        'jsonpath': {
          type: 'string',
        },
      },
      required: ['id.$', 'type', 'jsonpath'],
    },
  },
  EXTERNAL_MEMORY_ID_KEY: 'external_memory_id',
});

const ExecutionSource = Object.freeze({
  WORKFLOW_ID: {
    i18nTitle: '__fieldWorkflowId',
    value: 'workflow_id',
    icon: 'mdi-sitemap',
  },
  STATE_MACHINE_ARN: {
    i18nTitle: '__fieldStateMachineArn',
    value: 'state_machine_arn',
    icon: 'mdi-sitemap',
  },
});

const Icon = Object.freeze({
  CONTENT_TEMPLATE: 'mdi-file-document',
});

export {
  Base,
  ExecutionSource,
  ExternalMemoryParams,
  Icon,
  RetryParams,
};
