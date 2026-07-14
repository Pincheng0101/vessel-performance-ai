const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        status: {
          type: 'string',
        },
        output: {
          type: 'object',
        },
        error: {
          type: 'string',
        },
        cause: {
          type: 'string',
        },
      },
      required: ['status', 'output'],
    },
  },
});

export {
  ActionExecutionParams,
};
