import OllamaLlm from './OllamaLlm';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OllamaLlmResponse extends OllamaLlm {
  constructor({
    endpoint_url,
    frequency_penalty,
    llm_id,
    llm_name,
    llm_type,
    max_tokens,
    model,
    status,
    system_prompt,
    temperature,
    top_p,
    updated_ts,
  } = {}) {
    super({
      endpointUrl: endpoint_url,
      frequencyPenalty: frequency_penalty,
      llmId: llm_id,
      llmName: llm_name,
      llmType: llm_type,
      maxTokens: max_tokens,
      model,
      status,
      systemPrompt: system_prompt,
      temperature,
      topP: top_p,
      updatedTs: updated_ts,
    });
  }
}

export default OllamaLlmResponse;
