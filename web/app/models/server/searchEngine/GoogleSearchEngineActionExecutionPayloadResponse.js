import SearchEngineActionExecutionPayloadResponse from './SearchEngineActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GoogleSearchEngineActionExecutionPayloadResponse extends SearchEngineActionExecutionPayloadResponse {
  constructor({
    limit,
    query_string,
    query_template,
    search_engine_id,
    search_engine_type,
    compact_mode,
    exact_terms,
    exclude_terms,
    gl,
    lr,
    or_terms,
    site_search,
    site_search_filter,
    sort,
  } = {}) {
    super({
      query_string,
      query_template,
      search_engine_id,
      search_engine_type,
    });
    this.compactMode = compact_mode;
    this.exactTerms = exact_terms;
    this.excludeTerms = exclude_terms;
    this.gl = gl;
    this.lr = lr;
    this.limit = limit;
    this.orTerms = or_terms;
    this.siteSearch = site_search;
    this.siteSearchFilter = site_search_filter;
    this.sort = sort;
  }
}

export default GoogleSearchEngineActionExecutionPayloadResponse;
