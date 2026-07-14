import OpenAiLlm from './OpenAiLlm';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenAiLlmResponse extends OpenAiLlm {
  constructor({
    api_key,
    include_thinking,
    llm_id,
    llm_name,
    llm_type,
    max_tokens,
    model,
    status,
    system_prompt,
    temperature,
    thinking_effort,
    top_p,
    updated_ts,
  } = {}) {
    super({
      apiKey: api_key,
      includeThinking: include_thinking,
      llmId: llm_id,
      llmName: llm_name,
      llmType: llm_type,
      maxTokens: max_tokens,
      model,
      status,
      systemPrompt: system_prompt,
      temperature,
      thinkingEffort: thinking_effort,
      topP: top_p,
      updatedTs: updated_ts,
    });
  }
}

export default OpenAiLlmResponse;
