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
        text: {
          type: 'string',
        },
      },
      required: ['text'],
    },
  },
  TEMPLATE: '{{ content }}',
  VARIABLES: {
    'content.$': '$.content',
  },
});

export {
  ActionExecutionParams,
};
