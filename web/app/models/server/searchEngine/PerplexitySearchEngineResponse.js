import PerplexitySearchEngine from './PerplexitySearchEngine';
import PerplexityWebSearchOptionsResponse from './PerplexityWebSearchOptionsResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class PerplexitySearchEngineResponse extends PerplexitySearchEngine {
  constructor({
    api_key,
    frequency_penalty,
    max_tokens,
    model,
    presence_penalty,
    return_images,
    return_related_questions,
    search_domain_filter,
    search_engine_id,
    search_engine_name,
    search_engine_type,
    search_recency_filter,
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
      frequencyPenalty: frequency_penalty,
      maxTokens: max_tokens,
      model,
      presencePenalty: presence_penalty,
      returnImages: return_images,
      returnRelatedQuestions: return_related_questions,
      searchDomainFilter: search_domain_filter,
      searchEngineId: search_engine_id,
      searchEngineName: search_engine_name,
      searchEngineType: search_engine_type,
      searchRecencyFilter: search_recency_filter,
      status,
      systemInfo: system_info,
      systemPrompt: system_prompt,
      temperature,
      topK: top_k,
      topP: top_p,
      updatedTs: updated_ts,
      webSearchOptions: web_search_options ? new PerplexityWebSearchOptionsResponse(web_search_options) : null,
    });
  }
}

export default PerplexitySearchEngineResponse;
