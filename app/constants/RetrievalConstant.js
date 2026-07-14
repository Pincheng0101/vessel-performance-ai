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
        docs: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
      required: ['docs'],
    },
  },
});

export {
  ActionExecutionParams,
};
