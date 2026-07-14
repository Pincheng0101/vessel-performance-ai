import { SearchEngineConstant } from '~/constants';
import PerplexityWebSearchOptionsActionExecutionPayload from './PerplexityWebSearchOptionsActionExecutionPayload';
import SearchEngineActionExecutionPayload from './SearchEngineActionExecutionPayload';

class PerplexitySearchEngineActionExecutionPayload extends SearchEngineActionExecutionPayload {
  constructor({
    frequencyPenalty,
    jsonSchema,
    limit,
    maxTokens,
    outputTextIncludesCitation,
    presencePenalty,
    queryString,
    queryTemplate,
    returnImages,
    returnRelatedQuestions,
    searchDomainFilter,
    searchEngineId,
    searchEngineType,
    searchRecencyFilter,
    systemPrompt,
    temperature,
    topK,
    topP,
    webSearchOptions,
  } = {}) {
    super({
      queryString,
      queryTemplate,
      searchEngineId,
      searchEngineType,
    });
    this.frequencyPenalty = frequencyPenalty;
    this.jsonSchema = jsonSchema;
    this.maxTokens = maxTokens;
    this.outputTextIncludesCitation = outputTextIncludesCitation ?? SearchEngineConstant.ActionExecutionParams.PERPLEXITY_OUTPUT_TEXT_INCLUDES_CITATION;
    this.limit = limit ?? SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.default;
    this.presencePenalty = presencePenalty;
    this.returnImages = returnImages;
    this.returnRelatedQuestions = returnRelatedQuestions;
    this.searchDomainFilter = searchDomainFilter;
    this.searchRecencyFilter = searchRecencyFilter;
    this.systemPrompt = systemPrompt;
    this.temperature = temperature;
    this.topK = topK;
    this.topP = topP;
    this.webSearchOptions = new PerplexityWebSearchOptionsActionExecutionPayload(webSearchOptions);
  }

  /**
   * @param {PerplexitySearchEngineActionExecutionPayload} searchEngine
   */
  static toRequestPayload(searchEngine) {
    return {
      ...super.toRequestPayload(searchEngine),
      frequency_penalty: searchEngine.frequencyPenalty,
      json_schema: searchEngine.jsonSchema,
      max_tokens: searchEngine.maxTokens,
      output_text_includes_citation: searchEngine.outputTextIncludesCitation,
      limit: searchEngine.limit,
      presence_penalty: searchEngine.presencePenalty,
      return_images: searchEngine.returnImages,
      return_related_questions: searchEngine.returnRelatedQuestions,
      search_domain_filter: searchEngine.searchDomainFilter,
      search_recency_filter: searchEngine.searchRecencyFilter,
      system_prompt: searchEngine.systemPrompt,
      temperature: searchEngine.temperature,
      top_k: searchEngine.topK,
      top_p: searchEngine.topP,
      web_search_options: PerplexityWebSearchOptionsActionExecutionPayload.toRequestPayload(searchEngine.webSearchOptions),
    };
  }
}

export default PerplexitySearchEngineActionExecutionPayload;
