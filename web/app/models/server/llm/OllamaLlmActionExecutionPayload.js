import LlmActionExecutionPayload from './LlmActionExecutionPayload';

class OllamaLlmActionExecutionPayload extends LlmActionExecutionPayload {
  constructor({
    endpointUrl,
    content,
    frequencyPenalty,
    guardrailId,
    guardrailVersion,
    jsonSchema,
    llmId,
    llmType,
    maxTokens,
    messages,
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
    this.endpointUrl = endpointUrl;
    this.frequencyPenalty = frequencyPenalty;
    this.topP = topP;
  };

  /**
   * @param {OllamaLlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    return {
      ...super.toRequestPayload(llm),
      endpoint_url: llm.endpointUrl,
      frequency_penalty: llm.frequencyPenalty,
      top_p: llm.topP,
    };
  }
}

export default OllamaLlmActionExecutionPayload;
