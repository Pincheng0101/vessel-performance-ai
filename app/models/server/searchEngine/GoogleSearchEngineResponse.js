import GoogleSearchEngine from './GoogleSearchEngine';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GoogleSearchEngineResponse extends GoogleSearchEngine {
  constructor({
    api_key,
    cx,
    exact_terms,
    exclude_terms,
    gl,
    lr,
    or_terms,
    search_engine_id,
    search_engine_name,
    search_engine_type,
    site_search_filter,
    site_search,
    sort,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      apiKey: api_key,
      cx,
      exactTerms: exact_terms,
      excludeTerms: exclude_terms,
      gl,
      lr,
      orTerms: or_terms,
      searchEngineId: search_engine_id,
      searchEngineName: search_engine_name,
      searchEngineType: search_engine_type,
      siteSearch: site_search,
      siteSearchFilter: site_search_filter,
      sort,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default GoogleSearchEngineResponse;
