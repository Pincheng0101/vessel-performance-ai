import { GeolocationConstant, LanguageConstant, SearchEngineConstant } from '~/constants';
import SearchEngine from './SearchEngine';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

const { PIPE, SPACE } = SearchEngineConstant.Delimiter;

class GoogleSearchEngine extends SearchEngine {
  constructor({
    apiKey,
    cx,
    exactTerms,
    excludeTerms,
    gl,
    lr,
    orTerms,
    searchEngineId,
    searchEngineName,
    searchEngineType,
    siteSearch,
    siteSearchFilter,
    sort,
    status,
    systemInfo,
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
    this.apiKey = apiKey ?? '';
    this.cx = cx ?? '';
    this.exactTerms = (() => {
      if (Array.isArray(exactTerms)) return exactTerms;
      return exactTerms && typeof exactTerms === 'string' ? exactTerms.split(SPACE).filter(Boolean) : [];
    })();
    this.excludeTerms = (() => {
      if (Array.isArray(excludeTerms)) return excludeTerms;
      return excludeTerms && typeof excludeTerms === 'string' ? excludeTerms.split(SPACE).filter(Boolean) : [];
    })();
    this.gl = gl ?? GeolocationConstant.Google.TW.value;
    this.lr = (() => {
      if (Array.isArray(lr)) return lr;
      return lr && typeof lr === 'string' ? lr.split(PIPE).filter(Boolean) : [LanguageConstant.Google.EN.value, LanguageConstant.Google.ZH_TW.value];
    })();
    this.orTerms = (() => {
      if (Array.isArray(orTerms)) return orTerms;
      return orTerms && typeof orTerms === 'string' ? orTerms.split(SPACE).filter(Boolean) : [];
    })();
    this.siteSearch = siteSearch ?? null;
    this.siteSearchFilter = siteSearchFilter ?? null;
    this.sort = sort ?? null;
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
      { title: $i18n.t('__fieldSearchEngineId'), value: this.cx },
      { title: $i18n.t('__fieldExactTerm', 2), value: this.exactTerms, isChip: true },
      { title: $i18n.t('__fieldExcludeTerm', 2), value: this.excludeTerms, isChip: true },
      { title: $i18n.t('__fieldGeolocation'), value: findField(GeolocationConstant.Google, this.gl, 'title') },
      { title: $i18n.t('__fieldLanguageRestriction', 2), value: findField(LanguageConstant.Google, this.lr, 'title'), isChip: true },
      { title: $i18n.t('__fieldOrTerm', 2), value: this.orTerms, isChip: true },
      { title: $i18n.t('__fieldGoogleSiteSearch'), value: this.siteSearch },
      { title: $i18n.t('__fieldGoogleSiteSearchFilter'), value: this.siteSearchFilter ? $i18n.t(findField(SearchEngineConstant.GoogleSiteSearchFilter, this.siteSearchFilter, 'i18nTitle')) : null },
      { title: $i18n.t('__fieldSortResult'), value: this.sort },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {GoogleSearchEngine} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      cx: resource.cx,
      exact_terms: Array.isArray(resource.exactTerms) ? resource.exactTerms.join(SPACE) : resource.exactTerms,
      exclude_terms: Array.isArray(resource.excludeTerms) ? resource.excludeTerms.join(SPACE) : resource.excludeTerms,
      gl: resource.gl,
      lr: Array.isArray(resource.lr) ? resource.lr.join(PIPE) : resource.lr,
      or_terms: Array.isArray(resource.orTerms) ? resource.orTerms.join(SPACE) : resource.orTerms,
      site_search: resource.siteSearch,
      site_search_filter: resource.siteSearchFilter,
      sort: resource.sort,
    };
    // Only include apiKey if it's explicitly provided
    if (resource.apiKey) {
      payload.api_key = resource.apiKey;
    }
    return payload;
  }

  /**
   * @param {GoogleSearchEngine} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.apiKey && resource.cx) {
      return {
        api_key: resource.apiKey,
        cx: resource.cx,
        search_engine_type: resource.searchEngineType,
      };
    }
    return {
      search_engine_id: resource.searchEngineId,
      search_engine_type: resource.searchEngineType,
    };
  }
}

export default GoogleSearchEngine;
