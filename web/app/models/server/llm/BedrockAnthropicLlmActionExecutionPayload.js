import LlmActionExecutionPayload from './LlmActionExecutionPayload';

class BedrockAnthropicLlmActionExecutionPayload extends LlmActionExecutionPayload {
  constructor({
    content,
    enableThinking,
    guardrailId,
    guardrailVersion,
    includeThinking,
    jsonSchema,
    llmId,
    llmType,
    maxTokens,
    messages,
    performanceConfigLatency,
    systemPrompt,
    temperature,
    thinkingBudgetTokens,
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
    this.enableThinking = enableThinking;
    this.includeThinking = includeThinking;
    this.performanceConfigLatency = performanceConfigLatency;
    this.thinkingBudgetTokens = thinkingBudgetTokens;
    this.topK = topK;
    this.topP = topP;
  };

  /**
   * @param {BedrockAnthropicLlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    return {
      ...super.toRequestPayload(llm),
      enable_thinking: llm.enableThinking,
      include_thinking: llm.includeThinking,
      performance_config_latency: llm.performanceConfigLatency,
      thinking_budget_tokens: llm.thinkingBudgetTokens,
      top_k: llm.topK,
      top_p: llm.topP,
    };
  }
}

export default BedrockAnthropicLlmActionExecutionPayload;
