import { TemplateRenderBlockActionExecutionPayloadResponse } from '~/models/server/templateRenderBlock';
import SearchEngineActionExecutionPayload from './SearchEngineActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class SearchEngineActionExecutionPayloadResponse extends SearchEngineActionExecutionPayload {
  constructor({
    query_string,
    query_template,
    search_engine_id,
    search_engine_type,
  } = {}) {
    super({
      queryString: query_string,
      queryTemplate: query_template ? new TemplateRenderBlockActionExecutionPayloadResponse(query_template) : query_template,
      searchEngineId: search_engine_id,
      searchEngineType: search_engine_type,
    });
  }
}

export default SearchEngineActionExecutionPayloadResponse;
