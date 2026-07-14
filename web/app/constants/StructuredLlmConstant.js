import * as JsonSchemaConstant from './JsonSchemaConstant';
import * as LlmConstant from './LlmConstant';

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
        response: {
          type: 'object',
        },
        request: {
          type: 'object',
        },
        source_llm_id: {
          type: 'string',
        },
      },
      required: [],
    },
  },
  JSON_SCHEMA: JsonSchemaConstant.Base.DEFAULT_SCHEMA,
  MESSAGES: LlmConstant.ActionExecutionParams.MESSAGES,
  GUARDRAILS: LlmConstant.ActionExecutionParams.GUARDRAILS,
});

export {
  ActionExecutionParams,
};
