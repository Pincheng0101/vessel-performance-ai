import OpenAiWebSearchOptionsActionExecutionPayloadResponse from './OpenAiWebSearchOptionsActionExecutionPayloadResponse';
import SearchEngineActionExecutionPayloadResponse from './SearchEngineActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenAiWebSearchEngineActionExecutionPayloadResponse extends SearchEngineActionExecutionPayloadResponse {
  constructor({
    max_tokens,
    query_string,
    query_template,
    search_engine_id,
    search_engine_type,
    system_prompt,
    temperature,
    top_k,
    top_p,
    web_search_options,
  } = {}) {
    super({
      query_string,
      query_template,
      search_engine_id,
      search_engine_type,
    });
    this.maxTokens = max_tokens;
    this.systemPrompt = system_prompt;
    this.temperature = temperature;
    this.topK = top_k;
    this.topP = top_p;
    this.webSearchOptions = new OpenAiWebSearchOptionsActionExecutionPayloadResponse(web_search_options);
  }
}

export default OpenAiWebSearchEngineActionExecutionPayloadResponse;
