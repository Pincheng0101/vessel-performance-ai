import LlmActionExecutionPayload from './LlmActionExecutionPayload';

class BedrockNovaLlmActionExecutionPayload extends LlmActionExecutionPayload {
  constructor({
    content,
    guardrailId,
    guardrailVersion,
    jsonSchema,
    llmId,
    llmType,
    maxTokens,
    messages,
    performanceConfigLatency,
    systemPrompt,
    temperature,
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
    this.performanceConfigLatency = performanceConfigLatency;
    this.topK = topK;
    this.topP = topP;
  };

  /**
   * @param {BedrockNovaLlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    return {
      ...super.toRequestPayload(llm),
      performance_config_latency: llm.performanceConfigLatency,
      top_k: llm.topK,
      top_p: llm.topP,
    };
  }
}

export default BedrockNovaLlmActionExecutionPayload;
