import LlmActionExecutionPayload from './LlmActionExecutionPayload';

class OpenAiLlmActionExecutionPayload extends LlmActionExecutionPayload {
  constructor({
    content,
    guardrailId,
    guardrailVersion,
    includeThinking,
    jsonSchema,
    llmId,
    llmType,
    maxTokens,
    messages,
    systemPrompt,
    temperature,
    thinkingEffort,
    topP,
  } = {}) {
    super({
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
    });
    this.includeThinking = includeThinking;
    this.thinkingEffort = thinkingEffort;
    this.topP = topP;
  };

  /**
   * @param {OpenAiLlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    return {
      ...super.toRequestPayload(llm),
      api_key: llm.apiKey,
      include_thinking: llm.includeThinking,
      thinking_effort: llm.thinkingEffort,
      top_p: llm.topP,
    };
  }
}

export default OpenAiLlmActionExecutionPayload;
