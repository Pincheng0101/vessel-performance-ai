import { RegionConstant, SearchEngineConstant } from '~/constants';
import SearchEngine from './SearchEngine';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class DuckDuckGoSearchEngine extends SearchEngine {
  constructor({
    searchEngineId,
    searchEngineName,
    searchEngineType,
    region,
    safesearch,
    status,
    systemInfo,
    timelimit,
    updatedTs,
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
    this.region = region ?? RegionConstant.DuckDuckGo.WT_WT.value;
    this.safesearch = safesearch ?? SearchEngineConstant.DuckDuckGoSafeSearch.MODERATE.value;
    this.timelimit = timelimit ?? null;
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
      { title: $i18n.t('__fieldRegion'), value: findField(RegionConstant.DuckDuckGo, this.region, 'title') },
      { title: $i18n.t('__fieldSafeSearch'), value: $i18n.t(findField(SearchEngineConstant.DuckDuckGoSafeSearch, this.safesearch, 'i18nTitle')) },
      { title: $i18n.t('__fieldTimeLimit'), value: this.timelimit ? $i18n.t(findField(SearchEngineConstant.DuckDuckGoTimeLimit, this.timelimit, 'i18nTitle')) : null },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {DuckDuckGoSearchEngine} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      region: resource.region,
      safesearch: resource.safesearch,
      timelimit: resource.timelimit,
    };
  }

  /**
   * @param {DuckDuckGoSearchEngine} resource
   */
  static toValidateRequestPayload(resource) {
    return {
      search_engine_id: resource.searchEngineId,
      search_engine_type: resource.searchEngineType,
    };
  }
}

export default DuckDuckGoSearchEngine;
