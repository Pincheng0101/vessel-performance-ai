const Type = Object.freeze({
  SIMPLIFIED_TO_TRADITIONAL_CHINESE: {
    title: 'Simplified to Traditional Chinese',
    value: 'simplified_to_traditional_chinese',
    iconPath: '/images/icons/simplifiedToTraditionalChinese.svg',
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
        transformation_output: {},
      },
      required: ['transformation_output'],
    },
  },
  SIMPLIFIED_TO_TRADITIONAL_CHINESE_INPUT: {
    default: {},
    jsonSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'object',
        },
      },
    },
  },
});

export {
  ActionExecutionParams,
  Type,
};
