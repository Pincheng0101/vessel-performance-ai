import { SearchEngineConstant } from '~/constants';
import SearchEngineActionExecutionPayload from './SearchEngineActionExecutionPayload';

const { PIPE, SPACE } = SearchEngineConstant.Delimiter;

class GoogleSearchEngineActionExecutionPayload extends SearchEngineActionExecutionPayload {
  constructor({
    searchEngineId,
    compactMode,
    exactTerms,
    excludeTerms,
    gl,
    limit,
    lr,
    orTerms,
    queryString,
    queryTemplate,
    searchEngineType,
    siteSearch,
    siteSearchFilter,
    sort,
  } = {}) {
    super({
      queryString,
      queryTemplate,
      searchEngineId,
      searchEngineType,
    });
    this.compactMode = compactMode ?? SearchEngineConstant.ActionExecutionParams.GOOGLE_COMPACT_MODE;
    this.exactTerms = (() => {
      if (jsonPathUtils.isJsonPath(exactTerms)) return exactTerms;
      if (Array.isArray(exactTerms)) return exactTerms;
      return exactTerms && typeof exactTerms === 'string' ? exactTerms.split(SPACE).filter(Boolean) : [];
    })();
    this.excludeTerms = (() => {
      if (jsonPathUtils.isJsonPath(excludeTerms)) return excludeTerms;
      if (Array.isArray(excludeTerms)) return excludeTerms;
      return excludeTerms && typeof excludeTerms === 'string' ? excludeTerms.split(SPACE).filter(Boolean) : [];
    })();
    this.gl = gl;
    this.lr = (() => {
      if (jsonPathUtils.isJsonPath(lr)) return lr;
      if (Array.isArray(lr)) return lr;
      return lr && typeof lr === 'string' ? lr.split(PIPE).filter(Boolean) : [];
    })();
    this.limit = limit ?? SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.default;
    this.orTerms = (() => {
      if (jsonPathUtils.isJsonPath(orTerms)) return orTerms;
      if (Array.isArray(orTerms)) return orTerms;
      return orTerms && typeof orTerms === 'string' ? orTerms.split(SPACE).filter(Boolean) : [];
    })();
    this.siteSearch = siteSearch;
    this.siteSearchFilter = siteSearchFilter;
    this.sort = sort;
  }

  /**
   * @param {GoogleSearchEngineActionExecutionPayload} searchEngine
   */
  static toRequestPayload(searchEngine) {
    return {
      ...super.toRequestPayload(searchEngine),
      compact_mode: searchEngine.compactMode,
      exact_terms: Array.isArray(searchEngine.exactTerms) ? searchEngine.exactTerms.join(SPACE) : searchEngine.exactTerms,
      exclude_terms: Array.isArray(searchEngine.excludeTerms) ? searchEngine.excludeTerms.join(SPACE) : searchEngine.excludeTerms,
      gl: searchEngine.gl,
      lr: Array.isArray(searchEngine.lr) ? searchEngine.lr.join(PIPE) : searchEngine.lr,
      limit: searchEngine.limit,
      or_terms: Array.isArray(searchEngine.orTerms) ? searchEngine.orTerms.join(SPACE) : searchEngine.orTerms,
      site_search: searchEngine.siteSearch,
      site_search_filter: searchEngine.siteSearchFilter,
      sort: searchEngine.sort,
    };
  }
}

export default GoogleSearchEngineActionExecutionPayload;
