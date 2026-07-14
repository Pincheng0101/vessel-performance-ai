import LlmActionExecutionPayloadResponse from './LlmActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class BedrockAnthropicLlmActionExecutionPayloadResponse extends LlmActionExecutionPayloadResponse {
  constructor({
    content,
    enable_thinking,
    guardrail_id,
    guardrail_version,
    include_thinking,
    json_schema,
    llm_id,
    llm_type,
    max_tokens,
    messages,
    performance_config_latency,
    system_prompt,
    temperature,
    thinking_budget_tokens,
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
    this.enableThinking = enable_thinking;
    this.includeThinking = include_thinking;
    this.performanceConfigLatency = performance_config_latency;
    this.thinkingBudgetTokens = thinking_budget_tokens;
    this.topK = top_k;
    this.topP = top_p;
  };
}

export default BedrockAnthropicLlmActionExecutionPayloadResponse;
