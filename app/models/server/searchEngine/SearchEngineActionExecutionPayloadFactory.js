import { SearchEngineConstant } from '~/constants';
import DuckDuckGoSearchEngineActionExecutionPayload from './DuckDuckGoSearchEngineActionExecutionPayload';
import GoogleSearchEngineActionExecutionPayload from './GoogleSearchEngineActionExecutionPayload';
import OpenAiWebSearchEngineActionExecutionPayload from './OpenAiWebSearchEngineActionExecutionPayload';
import PerplexitySearchEngineActionExecutionPayload from './PerplexitySearchEngineActionExecutionPayload';
import SearchEngineActionExecutionPayload from './SearchEngineActionExecutionPayload';

class SearchEngineActionExecutionPayloadFactory {
  /**
   * @param {SearchEngineActionExecutionPayload} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.searchEngineType) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return new DuckDuckGoSearchEngineActionExecutionPayload(payload);
      case SearchEngineConstant.Type.GOOGLE.value:
        return new GoogleSearchEngineActionExecutionPayload(payload);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return new PerplexitySearchEngineActionExecutionPayload(payload);
      case SearchEngineConstant.Type.OPENAI.value:
        return new OpenAiWebSearchEngineActionExecutionPayload(payload);
      default:
        return new SearchEngineActionExecutionPayload(payload);
    }
  }

  /**
   * @param {SearchEngineActionExecutionPayload} searchEngine
   */
  static toRequestPayload(searchEngine) {
    switch (searchEngine.searchEngineType) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return DuckDuckGoSearchEngineActionExecutionPayload.toRequestPayload(searchEngine);
      case SearchEngineConstant.Type.GOOGLE.value:
        return GoogleSearchEngineActionExecutionPayload.toRequestPayload(searchEngine);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return PerplexitySearchEngineActionExecutionPayload.toRequestPayload(searchEngine);
      case SearchEngineConstant.Type.OPENAI.value:
        return OpenAiWebSearchEngineActionExecutionPayload.toRequestPayload(searchEngine);
      default:
        return SearchEngineActionExecutionPayload.toRequestPayload(searchEngine);
    }
  }
}

export default SearchEngineActionExecutionPayloadFactory;
