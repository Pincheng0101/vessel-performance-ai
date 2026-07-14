import { ContentBlockActionExecutionPayloadResponseFactory } from '~/models/server/contentBlock';
import { MessageActionExecutionPayloadResponse } from '~/models/server/message';
import LlmActionExecutionPayload from './LlmActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LlmActionExecutionPayloadResponse extends LlmActionExecutionPayload {
  constructor({
    content,
    guardrail_id,
    guardrail_version,
    json_schema,
    llm_id,
    llm_type,
    max_tokens,
    messages,
    system_prompt,
    temperature,
  } = {}) {
    super({
      content: jsonPathUtils.isJsonPath(content)
        ? content
        : content?.map(ContentBlockActionExecutionPayloadResponseFactory.create),
      guardrailId: guardrail_id,
      guardrailVersion: guardrail_version,
      jsonSchema: json_schema,
      llmId: llm_id,
      llmType: llm_type,
      maxTokens: max_tokens,
      messages: (() => {
        if (!messages) return null;
        if (jsonPathUtils.isJsonPath(messages)) return messages;
        if (objUtils.isObject(messages)) return messages;
        if (!Array.isArray(messages)) return [];
        return messages.map(item => new MessageActionExecutionPayloadResponse(item));
      })(),
      systemPrompt: system_prompt,
      temperature,
    });
  }
}

export default LlmActionExecutionPayloadResponse;
