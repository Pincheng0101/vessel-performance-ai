import SearchEngineActionExecutionPayloadResponse from './SearchEngineActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DuckDuckGoSearchEngineActionExecutionPayloadResponse extends SearchEngineActionExecutionPayloadResponse {
  constructor({
    limit,
    query_string,
    query_template,
    search_engine_id,
    search_engine_type,
    region,
    safe_search,
    time_limit,
  } = {}) {
    super({
      query_string,
      query_template,
      search_engine_id,
      search_engine_type,
    });
    this.limit = limit;
    this.region = region;
    this.safesearch = safe_search;
    this.timelimit = time_limit;
  }
}

export default DuckDuckGoSearchEngineActionExecutionPayloadResponse;
