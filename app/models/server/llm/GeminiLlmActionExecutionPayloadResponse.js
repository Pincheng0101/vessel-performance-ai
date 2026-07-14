import LlmActionExecutionPayloadResponse from './LlmActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GeminiLlmActionExecutionPayloadResponse extends LlmActionExecutionPayloadResponse {
  constructor({
    api_key,
    content,
    include_thinking,
    guardrail_id,
    guardrail_version,
    json_schema,
    llm_id,
    llm_type,
    max_tokens,
    messages,
    system_prompt,
    temperature,
    thinking_budget_tokens,
    thinking_level,
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
    this.apiKey = api_key;
    this.includeThinking = include_thinking;
    this.thinkingBudgetTokens = thinking_budget_tokens;
    this.thinkingLevel = thinking_level;
    this.topK = top_k;
    this.topP = top_p;
  };
}

export default GeminiLlmActionExecutionPayloadResponse;
