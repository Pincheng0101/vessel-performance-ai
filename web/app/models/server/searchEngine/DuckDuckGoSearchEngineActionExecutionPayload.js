import { SearchEngineConstant } from '~/constants';
import SearchEngineActionExecutionPayload from './SearchEngineActionExecutionPayload';

class DuckDuckGoSearchEngineActionExecutionPayload extends SearchEngineActionExecutionPayload {
  constructor({
    limit,
    queryString,
    queryTemplate,
    region,
    safesearch,
    searchEngineId,
    searchEngineType,
    timelimit,
  } = {}) {
    super({
      queryString,
      queryTemplate,
      searchEngineId,
      searchEngineType,
    });
    this.limit = limit ?? SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.default;
    this.region = region;
    this.safesearch = safesearch;
    this.timelimit = timelimit;
  }

  /**
   * @param {DuckDuckGoSearchEngineActionExecutionPayload} searchEngine
   */
  static toRequestPayload(searchEngine) {
    return {
      ...super.toRequestPayload(searchEngine),
      limit: searchEngine.limit,
      region: searchEngine.region,
      safesearch: searchEngine.safesearch,
      timelimit: searchEngine.timelimit,
    };
  }
}

export default DuckDuckGoSearchEngineActionExecutionPayload;
