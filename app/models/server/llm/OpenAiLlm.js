import { LlmConstant } from '~/constants';
import Llm from './Llm';

class OpenAiLlm extends Llm {
  constructor({
    apiKey,
    includeThinking,
    llmId,
    llmName,
    llmType,
    maxTokens,
    model,
    status,
    systemInfo,
    systemPrompt,
    temperature,
    thinkingEffort,
    topP,
    updatedTs,
  } = {}) {
    super({
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
    });
    // Set fields explicitly to prevent backend default values
    this.apiKey = apiKey ?? '';
    this.includeThinking = includeThinking ?? false;
    this.thinkingEffort = thinkingEffort ?? null;
    this.topP = topP ?? null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(LlmConstant.Type, this.type, 'title'), iconPath: findField(LlmConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldModel'), value: findField(LlmConstant.OpenAiModel, this.model, 'title') },
      { title: $i18n.t('__fieldMaxTokens'), value: numUtils.format(this.maxTokens) },
      { title: $i18n.t('__fieldTemperature'), value: this.temperature },
      { title: $i18n.t('__fieldTopP'), value: this.topP },
      { title: $i18n.t('__fieldIncludeThinking'), value: this.includeThinking ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: { color: this.includeThinking ? 'success' : null } },
      { title: $i18n.t('__fieldThinkingEffort'), value: this.thinkingEffort ? $i18n.t(findField(LlmConstant.ThinkingEffort, this.thinkingEffort, 'i18nTitle')) : null },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @returns {DisplayField[]}
   */
  get systemPromptDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldSystemPrompt'), value: this.systemPrompt, isBlockText: true },
    ];
  }

  /**
   * @param {OpenAiLlm} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      top_p: resource.topP,
      include_thinking: resource.includeThinking,
      thinking_effort: resource.thinkingEffort,
    };
    // Only include apiKey if it's explicitly provided
    if (resource.apiKey) {
      payload.api_key = resource.apiKey;
    }
    return payload;
  }

  /**
   * @param {OpenAiLlm} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.apiKey) {
      return {
        api_key: resource.apiKey,
        model: resource.model,
        llm_type: resource.llmType,
      };
    }
    return {
      llm_id: resource.llmId,
      llm_type: resource.llmType,
    };
  }
}

export default OpenAiLlm;
