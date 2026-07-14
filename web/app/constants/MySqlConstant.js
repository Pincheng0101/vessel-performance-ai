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
        rows: {
          type: 'array',
        },
        num_affected_rows: {
          type: 'number',
        },
      },
      required: ['rows', 'num_affected_rows'],
    },
  },
  ARGS: {},
});

export {
  ActionExecutionParams,
};
