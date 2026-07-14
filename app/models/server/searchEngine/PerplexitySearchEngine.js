import { SearchEngineConstant } from '~/constants';
import PerplexityWebSearchOptions from './PerplexityWebSearchOptions';
import SearchEngine from './SearchEngine';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class PerplexitySearchEngine extends SearchEngine {
  constructor({
    apiKey,
    frequencyPenalty,
    maxTokens,
    model,
    presencePenalty,
    returnImages,
    returnRelatedQuestions,
    searchDomainFilter,
    searchEngineId,
    searchEngineName,
    searchEngineType,
    searchRecencyFilter,
    status,
    systemInfo,
    systemPrompt,
    temperature,
    topK,
    topP,
    updatedTs,
    webSearchOptions,
  } = {}) {
    super({
      searchEngineId,
      searchEngineName,
      searchEngineType,
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.apiKey = apiKey ?? '';
    this.frequencyPenalty = frequencyPenalty ?? null;
    this.maxTokens = maxTokens ?? null;
    this.model = model ?? '';
    this.presencePenalty = presencePenalty ?? null;
    this.returnImages = returnImages ?? null;
    this.returnRelatedQuestions = returnRelatedQuestions ?? null;
    this.searchDomainFilter = searchDomainFilter?.map(domain => ({ domain }));
    this.searchRecencyFilter = searchRecencyFilter ?? null;
    this.systemPrompt = systemPrompt ?? null;
    this.temperature = temperature ?? null;
    this.topK = topK ?? null;
    this.topP = topP ?? null;
    this.webSearchOptions = new PerplexityWebSearchOptions(webSearchOptions ?? {
      searchContextSize: SearchEngineConstant.SearchContextSize.LOW.value,
    });
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(SearchEngineConstant.Type, this.type, 'title'), iconPath: findField(SearchEngineConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldSystemPrompt'), value: this.systemPrompt, isBlockText: true },
      { title: $i18n.t('__fieldModel'), value: findField(SearchEngineConstant.PerplexityModel, this.model, 'title') },
      { title: $i18n.t('__fieldMaxTokens'), value: this.maxTokens },
      { title: $i18n.t('__fieldTemperature'), value: this.temperature },
      { title: $i18n.t('__fieldTopK'), value: this.topK },
      { title: $i18n.t('__fieldTopP'), value: this.topP },
      { title: $i18n.t('__fieldFrequencyPenalty'), value: this.frequencyPenalty },
      { title: $i18n.t('__fieldPresencePenalty'), value: this.presencePenalty },
      { title: $i18n.t('__fieldSearchDomainFilter'), value: this.searchDomainFilter?.map(item => item.domain), isChip: true },
      { title: $i18n.t('__fieldSearchRecencyFilter'), value: this.searchRecencyFilter ? $i18n.t(findField(SearchEngineConstant.PerplexitySearchRecencyFilter, this.searchRecencyFilter, 'i18nTitle')) : null },
      { title: $i18n.t('__fieldReturnImages'), value: this.returnImages },
      { title: $i18n.t('__fieldReturnRelatedQuestions'), value: this.returnRelatedQuestions },
      { title: $i18n.t('__fieldSearchContextSize'), value: $i18n.t(findField(SearchEngineConstant.SearchContextSize, this.webSearchOptions.searchContextSize, 'i18nTitle')) },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {PerplexitySearchEngine} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      frequency_penalty: resource.frequencyPenalty,
      max_tokens: resource.maxTokens,
      model: resource.model,
      presence_penalty: resource.presencePenalty,
      return_images: resource.returnImages,
      return_related_questions: resource.returnRelatedQuestions,
      search_domain_filter: resource.searchDomainFilter?.map(item => item.domain),
      search_recency_filter: resource.searchRecencyFilter,
      system_prompt: resource.systemPrompt,
      temperature: resource.temperature,
      top_k: resource.topK,
      top_p: resource.topP,
      web_search_options: PerplexityWebSearchOptions.toRequestPayload(resource.webSearchOptions),
    };
    // Only include apiKey if it's explicitly provided
    if (resource.apiKey) {
      payload.api_key = resource.apiKey;
    }
    return payload;
  }

  /**
   * @param {PerplexitySearchEngine} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.apiKey && resource.model) {
      return {
        api_key: resource.apiKey,
        model: resource.model,
        search_engine_type: resource.searchEngineType,
      };
    }
    return {
      search_engine_id: resource.searchEngineId,
      search_engine_type: resource.searchEngineType,
    };
  }
}

export default PerplexitySearchEngine;
