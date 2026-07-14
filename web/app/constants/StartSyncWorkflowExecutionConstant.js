const ActionExecutionParams = Object.freeze({
  INPUT: {},
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
        execution_arn: {
          type: 'string',
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
      required: [],
    },
  },
});

export {
  ActionExecutionParams,
};
