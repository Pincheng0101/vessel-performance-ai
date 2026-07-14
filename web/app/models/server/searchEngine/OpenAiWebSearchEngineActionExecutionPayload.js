import OpenAiWebSearchOptionsActionExecutionPayload from './OpenAiWebSearchOptionsActionExecutionPayload';
import SearchEngineActionExecutionPayload from './SearchEngineActionExecutionPayload';

class OpenAiWebSearchEngineActionExecutionPayload extends SearchEngineActionExecutionPayload {
  constructor({
    maxTokens,
    queryString,
    queryTemplate,
    searchEngineId,
    searchEngineType,
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
    this.maxTokens = maxTokens;
    this.systemPrompt = systemPrompt;
    this.temperature = temperature;
    this.topK = topK;
    this.topP = topP;
    this.webSearchOptions = new OpenAiWebSearchOptionsActionExecutionPayload(webSearchOptions);
  }

  /**
   * @param {OpenAiWebSearchEngineActionExecutionPayload} searchEngine
   */
  static toRequestPayload(searchEngine) {
    return {
      ...super.toRequestPayload(searchEngine),
      max_tokens: searchEngine.maxTokens,
      system_prompt: searchEngine.systemPrompt,
      temperature: searchEngine.temperature,
      top_k: searchEngine.topK,
      top_p: searchEngine.topP,
      web_search_options: OpenAiWebSearchOptionsActionExecutionPayload.toRequestPayload(searchEngine.webSearchOptions),
    };
  }
}

export default OpenAiWebSearchEngineActionExecutionPayload;
