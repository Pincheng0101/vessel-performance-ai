import PerplexityWebSearchOptionsActionExecutionPayloadResponse from './PerplexityWebSearchOptionsActionExecutionPayloadResponse';
import SearchEngineActionExecutionPayloadResponse from './SearchEngineActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class PerplexitySearchEngineActionExecutionPayloadResponse extends SearchEngineActionExecutionPayloadResponse {
  constructor({
    frequency_penalty,
    json_schema,
    limit,
    max_tokens,
    output_text_includes_citation,
    presence_penalty,
    query_string,
    query_template,
    return_images,
    return_related_questions,
    search_domain_filter,
    search_engine_id,
    search_engine_type,
    search_recency_filter,
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
    this.frequencyPenalty = frequency_penalty;
    this.jsonSchema = json_schema;
    this.maxTokens = max_tokens;
    this.outputTextIncludesCitation = output_text_includes_citation;
    this.limit = limit;
    this.presencePenalty = presence_penalty;
    this.returnImages = return_images;
    this.returnRelatedQuestions = return_related_questions;
    this.searchDomainFilter = search_domain_filter;
    this.searchRecencyFilter = search_recency_filter;
    this.systemPrompt = system_prompt;
    this.temperature = temperature;
    this.topK = top_k;
    this.topP = top_p;
    this.webSearchOptions = new PerplexityWebSearchOptionsActionExecutionPayloadResponse(web_search_options);
  }
}

export default PerplexitySearchEngineActionExecutionPayloadResponse;
