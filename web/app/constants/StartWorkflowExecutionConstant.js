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
      },
      required: ['execution_arn'],
    },
  },
});

export {
  ActionExecutionParams,
};
