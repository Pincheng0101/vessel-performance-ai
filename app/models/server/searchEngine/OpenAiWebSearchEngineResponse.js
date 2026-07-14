import OpenAiWebSearchEngine from './OpenAiWebSearchEngine';
import OpenAiWebSearchOptionsResponse from './OpenAiWebSearchOptionsResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenAiWebSearchEngineResponse extends OpenAiWebSearchEngine {
  constructor({
    api_key,
    max_tokens,
    model,
    search_engine_id,
    search_engine_name,
    search_engine_type,
    status,
    system_info,
    system_prompt,
    temperature,
    top_k,
    top_p,
    updated_ts,
    web_search_options,
  } = {}) {
    super({
      apiKey: api_key,
      maxTokens: max_tokens,
      model,
      searchEngineId: search_engine_id,
      searchEngineName: search_engine_name,
      searchEngineType: search_engine_type,
      status,
      systemInfo: system_info,
      systemPrompt: system_prompt,
      temperature,
      topK: top_k,
      topP: top_p,
      updatedTs: updated_ts,
      webSearchOptions: web_search_options ? new OpenAiWebSearchOptionsResponse(web_search_options) : null,
    });
  }
}

export default OpenAiWebSearchEngineResponse;
