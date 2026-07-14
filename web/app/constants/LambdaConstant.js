const FunctionReferenceMode = Object.freeze({
  RESOURCE: {
    i18nTitle: '__fieldLambdaFunctionByResource',
    icon: 'mdi-lambda',
    value: 'resource',
  },
  NAME: {
    i18nTitle: '__fieldLambdaFunctionByName',
    icon: 'mdi-lambda',
    value: 'name',
  },
});

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
});

export {
  ActionExecutionParams,
  FunctionReferenceMode,
};
