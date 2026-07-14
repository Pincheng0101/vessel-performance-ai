import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Llm extends Resource {
  constructor({
    llmId,
    llmName,
    llmType,
    maxTokens,
    model,
    status,
    systemInfo,
    systemPrompt,
    temperature,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.llmId = llmId ?? '';
    this.llmName = llmName ?? '';
    this.llmType = llmType ?? '';
    this.maxTokens = maxTokens ?? null;
    this.model = model ?? '';
    this.systemPrompt = systemPrompt ?? null;
    this.temperature = temperature ?? null;
  }

  get resourceType() {
    return ResourceConstant.Type.LLM.value;
  }

  get id() {
    return this.llmId;
  }

  get name() {
    return this.llmName;
  }

  get type() {
    return this.llmType;
  }

  /**
   * @param {Llm} resource
   */
  static toRequestPayload(resource) {
    return {
      llm_id: resource.llmId,
      llm_name: resource.llmName,
      llm_type: resource.llmType,
      max_tokens: resource.maxTokens,
      model: resource.model,
      system_prompt: resource.systemPrompt,
      temperature: resource.temperature,
    };
  }
}

export default Llm;
