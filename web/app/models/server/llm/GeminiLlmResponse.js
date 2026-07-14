import GeminiLlm from './GeminiLlm';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GeminiLlmResponse extends GeminiLlm {
  constructor({
    api_key,
    include_thinking,
    llm_id,
    llm_name,
    llm_type,
    max_tokens,
    model,
    region,
    status,
    system_info,
    system_prompt,
    temperature,
    thinking_budget_tokens,
    thinking_level,
    top_k,
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
      region,
      status,
      systemInfo: system_info,
      systemPrompt: system_prompt,
      temperature,
      thinkingBudgetTokens: thinking_budget_tokens,
      thinkingLevel: thinking_level,
      topK: top_k,
      topP: top_p,
      updatedTs: updated_ts,
    });
  }
}

export default GeminiLlmResponse;
