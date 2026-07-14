import { SearchEngineConstant } from '~/constants';
import OpenAiWebSearchOptions from './OpenAiWebSearchOptions';
import SearchEngine from './SearchEngine';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class OpenAiWebSearchEngine extends SearchEngine {
  constructor({
    apiKey,
    maxTokens,
    model,
    searchEngineId,
    searchEngineName,
    searchEngineType,
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
    this.maxTokens = maxTokens ?? null;
    this.model = model ?? '';
    this.systemPrompt = systemPrompt ?? null;
    this.temperature = temperature ?? null;
    this.topK = topK ?? null;
    this.topP = topP ?? null;
    this.webSearchOptions = new OpenAiWebSearchOptions(webSearchOptions ?? {
      searchContextSize: SearchEngineConstant.SearchContextSize.LOW.value,
      userLocationCountry: null,
      userLocationRegion: null,
      userLocationCity: null,
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
      { title: $i18n.t('__fieldSearchContextSize'), value: $i18n.t(findField(SearchEngineConstant.SearchContextSize, this.webSearchOptions.searchContextSize, 'i18nTitle')) },
      { title: $i18n.t('__fieldUserLocationCity'), value: this.webSearchOptions.userLocationCity },
      { title: $i18n.t('__fieldUserLocationCountry'), value: this.webSearchOptions.userLocationCountry },
      { title: $i18n.t('__fieldUserLocationRegion'), value: this.webSearchOptions.userLocationRegion },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {OpenAiWebSearchEngine} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      max_tokens: resource.maxTokens,
      model: resource.model,
      system_prompt: resource.systemPrompt,
      temperature: resource.temperature,
      top_k: resource.topK,
      top_p: resource.topP,
      web_search_options: OpenAiWebSearchOptions.toRequestPayload(resource.webSearchOptions),
    };
    // Only include apiKey if it's explicitly provided
    if (resource.apiKey) {
      payload.api_key = resource.apiKey;
    }
    return payload;
  }

  /**
   * @param {OpenAiWebSearchEngine} resource
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

export default OpenAiWebSearchEngine;
