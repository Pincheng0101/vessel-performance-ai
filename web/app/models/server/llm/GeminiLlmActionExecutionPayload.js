import LlmActionExecutionPayload from './LlmActionExecutionPayload';

class GeminiLlmActionExecutionPayload extends LlmActionExecutionPayload {
  constructor({
    content,
    includeThinking,
    guardrailId,
    guardrailVersion,
    jsonSchema,
    llmId,
    llmType,
    maxTokens,
    messages,
    systemPrompt,
    temperature,
    thinkingBudgetTokens,
    thinkingLevel,
    topK,
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
    this.thinkingBudgetTokens = thinkingBudgetTokens;
    this.thinkingLevel = thinkingLevel;
    this.topK = topK;
    this.topP = topP;
  };

  /**
   * @param {GeminiLlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    return {
      ...super.toRequestPayload(llm),
      api_key: llm.apiKey,
      include_thinking: llm.includeThinking,
      thinking_budget_tokens: llm.thinkingBudgetTokens,
      thinking_level: llm.thinkingLevel,
      top_k: llm.topK,
      top_p: llm.topP,
    };
  }
}

export default GeminiLlmActionExecutionPayload;
