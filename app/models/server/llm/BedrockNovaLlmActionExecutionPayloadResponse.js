import LlmActionExecutionPayloadResponse from './LlmActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class BedrockNovaLlmActionExecutionPayloadResponse extends LlmActionExecutionPayloadResponse {
  constructor({
    content,
    guardrail_id,
    guardrail_version,
    json_schema,
    llm_id,
    llm_type,
    max_tokens,
    messages,
    performance_config_latency,
    system_prompt,
    temperature,
    top_k,
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
    this.performanceConfigLatency = performance_config_latency;
    this.topK = top_k;
    this.topP = top_p;
  };
}

export default BedrockNovaLlmActionExecutionPayloadResponse;
