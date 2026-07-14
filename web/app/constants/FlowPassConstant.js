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
        output: {
          type: 'object',
        },
      },
      required: ['output'],
    },
  },
  PARAMETERS: {},
});

export {
  ActionExecutionParams,
};
