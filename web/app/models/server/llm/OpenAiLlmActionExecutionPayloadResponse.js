import LlmActionExecutionPayloadResponse from './LlmActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenAiLlmActionExecutionPayloadResponse extends LlmActionExecutionPayloadResponse {
  constructor({
    api_key,
    content,
    guardrail_id,
    guardrail_version,
    include_thinking,
    json_schema,
    llm_id,
    llm_type,
    max_tokens,
    messages,
    system_prompt,
    temperature,
    thinking_effort,
    top_p,
  } = {}) {
    super({
      content,
      guardrail_id,
      guardrail_version,
      include_thinking,
      json_schema,
      llm_id,
      llm_type,
      max_tokens,
      messages,
      system_prompt,
      temperature,
      thinking_effort,
    });
    this.apiKey = api_key;
    this.topP = top_p;
  }
}

export default OpenAiLlmActionExecutionPayloadResponse;
