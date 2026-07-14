import LlmActionExecutionPayload from './LlmActionExecutionPayload';

class BedrockGptOssLlmActionExecutionPayload extends LlmActionExecutionPayload {
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
    this.topP = topP;
  };

  /**
   * @param {BedrockGptOssLlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    return {
      ...super.toRequestPayload(llm),
      performance_config_latency: llm.performanceConfigLatency,
      top_p: llm.topP,
    };
  }
}

export default BedrockGptOssLlmActionExecutionPayload;
