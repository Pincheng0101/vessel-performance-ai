import { LlmConstant } from '~/constants';
import Llm from './Llm';

class OllamaLlm extends Llm {
  constructor({
    endpointUrl,
    frequencyPenalty,
    llmId,
    llmName,
    llmType,
    maxTokens,
    model,
    status,
    systemInfo,
    systemPrompt,
    temperature,
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
    this.endpointUrl = endpointUrl ?? '';
    this.topP = topP ?? null;
    this.frequencyPenalty = frequencyPenalty ?? null;
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
      { title: $i18n.t('__fieldEndpointUrl'), value: this.endpointUrl },
      { title: $i18n.t('__fieldModel'), value: this.model },
      { title: $i18n.t('__fieldMaxTokens'), value: numUtils.format(this.maxTokens) },
      { title: $i18n.t('__fieldTemperature'), value: this.temperature },
      { title: $i18n.t('__fieldTopP'), value: this.topP },
      { title: $i18n.t('__fieldFrequencyPenalty'), value: this.frequencyPenalty },
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
   * @param {OllamaLlm} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      endpoint_url: resource.endpointUrl,
      top_p: resource.topP,
      frequency_penalty: resource.frequencyPenalty,
    };
  }

  /**
   * @param {OllamaLlm} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.endpointUrl) {
      return {
        endpoint_url: resource.endpointUrl,
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

export default OllamaLlm;
