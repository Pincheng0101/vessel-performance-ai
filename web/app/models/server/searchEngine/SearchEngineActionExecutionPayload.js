import { TemplateRenderBlockActionExecutionPayload } from '~/models/server/templateRenderBlock';

class SearchEngineActionExecutionPayload {
  constructor({
    queryString,
    queryTemplate,
    searchEngineId,
    searchEngineType,
  } = {}) {
    this.queryString = queryString;
    this.queryTemplate = queryTemplate ? new TemplateRenderBlockActionExecutionPayload(queryTemplate) : queryTemplate;
    this.searchEngineId = searchEngineId;
    this.searchEngineType = searchEngineType;
  }

  /**
   * @param {SearchEngineActionExecutionPayload} searchEngine
   */
  static toRequestPayload(searchEngine) {
    return {
      query_string: searchEngine.queryString,
      query_template: searchEngine.queryTemplate ? TemplateRenderBlockActionExecutionPayload.toRequestPayload(searchEngine.queryTemplate) : searchEngine.queryTemplate,
      search_engine_id: searchEngine.searchEngineId,
      search_engine_type: searchEngine.searchEngineType,
    };
  }
}

export default SearchEngineActionExecutionPayload;
