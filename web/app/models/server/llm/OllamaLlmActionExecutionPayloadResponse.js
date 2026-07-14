import LlmActionExecutionPayloadResponse from './LlmActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OllamaLlmActionExecutionPayloadResponse extends LlmActionExecutionPayloadResponse {
  constructor({
    endpoint_url,
    content,
    frequency_penalty,
    guardrail_id,
    guardrail_version,
    json_schema,
    llm_id,
    llm_type,
    max_tokens,
    messages,
    system_prompt,
    temperature,
    top_p,
  } = {}) {
    super({
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
    });
    this.endpointUrl = endpoint_url;
    this.frequencyPenalty = frequency_penalty;
    this.topP = top_p;
  }
}

export default OllamaLlmActionExecutionPayloadResponse;
