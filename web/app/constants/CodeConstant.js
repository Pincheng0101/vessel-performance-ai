const RuntimeTypes = {
  PYDANTIC_MONTY: {
    i18nTitle: '__fieldCodeRuntimeSafeMode',
    i18nSubtitle: '__subtitleCodeRuntimeSafeMode',
    value: 'pydantic_monty',
    icon: 'mdi-language-python',
    adminOnly: false,
  },
  EVAL: {
    i18nTitle: '__fieldCodeRuntimeAdvancedMode',
    i18nSubtitle: '__subtitleCodeRuntimeAdvancedMode',
    value: 'eval',
    icon: 'mdi-language-python',
    adminOnly: true,
  },
};

const ActionExecutionParams = Object.freeze({
  CODE: '# The function must be named "handler".\ndef handler(data):\n  # Replace the code below with your implementation.\n  output = data\n\n  # Ensure that the function returns the result.\n  return output',
  DATA: {},
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
        output: {},
      },
      required: ['output'],
    },
  },
});

const CodeGenerateDefaultParams = Object.freeze({
  DESCRIPTION: {
    min: 1,
    max: 50000,
  },
});

export {
  ActionExecutionParams,
  CodeGenerateDefaultParams,
  RuntimeTypes,
};
