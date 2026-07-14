import { LlmConstant } from '~/constants';
import { ContentBlockActionExecutionPayloadFactory } from '~/models/server/contentBlock';
import { MessageActionExecutionPayload } from '~/models/server/message';

class LlmActionExecutionPayload {
  constructor({
    // Keep content for backward compatibility
    content,
    guardrailId,
    guardrailVersion,
    jsonSchema,
    llmId,
    llmType,
    maxTokens,
    messages,
    systemPrompt,
    temperature,
  } = {}) {
    this.content = (() => {
      if (!content) return [];
      if (jsonPathUtils.isJsonPath(content)) return content;
      if (!Array.isArray(content)) return [];
      return content.map(ContentBlockActionExecutionPayloadFactory.create);
    })();
    this.guardrailId = guardrailId;
    this.guardrailVersion = guardrailVersion;
    this.jsonSchema = jsonSchema;
    this.llmId = llmId;
    this.llmType = llmType;
    this.maxTokens = maxTokens;
    this.messages = (() => {
      if (!messages) return [];
      if (jsonPathUtils.isJsonPath(messages)) return messages;
      if (objUtils.isObject(messages)) return messages;
      if (!Array.isArray(messages)) return [];
      return messages.map(item => new MessageActionExecutionPayload(item));
    })();
    this.systemPrompt = systemPrompt;
    this.temperature = temperature;
  }

  /**
   * @param {LlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    const payload = {
      // Keep content for backward compatibility
      content: (() => {
        if (!llm.content) return [];
        if (jsonPathUtils.isJsonPath(llm.content)) return llm.content;
        if (!Array.isArray(llm.content)) return [];
        return llm.content.map(ContentBlockActionExecutionPayloadFactory.toRequestPayload);
      })(),
      guardrail_id: llm.guardrailId,
      guardrail_version: llm.guardrailVersion,
      json_schema: llm.jsonSchema,
      llm_id: llm.llmId,
      llm_type: llm.llmType,
      max_tokens: llm.maxTokens,
      messages: (() => {
        if (!llm.messages) return [];
        if (jsonPathUtils.isJsonPath(llm.messages)) return llm.messages;
        if (objUtils.isObject(llm.messages)) return llm.messages;
        if (!Array.isArray(llm.messages)) return [];
        return llm.messages.map(MessageActionExecutionPayload.toRequestPayload);
      })(),
      system_prompt: llm.systemPrompt,
      temperature: llm.temperature,
    };
    // Migrate content to messages
    if (payload.content) {
      if (payload.messages.length === 0) {
        payload.messages = [
          {
            role: LlmConstant.MessageRole.USER.value,
            content: payload.content,
          },
        ];
      }
      delete payload.content;
    }
    return payload;
  }
}

export default LlmActionExecutionPayload;
