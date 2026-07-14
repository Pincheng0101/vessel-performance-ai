import Llm from './Llm';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LlmResponse extends Llm {
  constructor({
    llm_id,
    llm_name,
    llm_type,
    max_tokens,
    model,
    status,
    system_info,
    system_prompt,
    temperature,
    updated_ts,
  } = {}) {
    super({
      llmId: llm_id,
      llmName: llm_name,
      llmType: llm_type,
      maxTokens: max_tokens,
      model,
      status,
      systemInfo: system_info,
      systemPrompt: system_prompt,
      temperature,
      updatedTs: updated_ts,
    });
  }
}

export default LlmResponse;
