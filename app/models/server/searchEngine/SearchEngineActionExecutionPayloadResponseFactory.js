import { SearchEngineConstant } from '~/constants';
import DuckDuckGoSearchEngineActionExecutionPayloadResponse from './DuckDuckGoSearchEngineActionExecutionPayloadResponse';
import GoogleSearchEngineActionExecutionPayloadResponse from './GoogleSearchEngineActionExecutionPayloadResponse';
import OpenAiWebSearchEngineActionExecutionPayloadResponse from './OpenAiWebSearchEngineActionExecutionPayloadResponse';
import PerplexitySearchEngineActionExecutionPayloadResponse from './PerplexitySearchEngineActionExecutionPayloadResponse';
import SearchEngineActionExecutionPayloadResponse from './SearchEngineActionExecutionPayloadResponse';

class SearchEngineActionExecutionPayloadResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.search_engine_type
   */
  static create(payload) {
    const normalized = referencePathUtils.removeSuffixes(payload);
    // Use ?. to handle a potential null payload
    switch (normalized?.search_engine_type) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return new DuckDuckGoSearchEngineActionExecutionPayloadResponse(normalized);
      case SearchEngineConstant.Type.GOOGLE.value:
        return new GoogleSearchEngineActionExecutionPayloadResponse(normalized);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return new PerplexitySearchEngineActionExecutionPayloadResponse(normalized);
      case SearchEngineConstant.Type.OPENAI.value:
        return new OpenAiWebSearchEngineActionExecutionPayloadResponse(normalized);
      default:
        return new SearchEngineActionExecutionPayloadResponse(normalized);
    }
  }
}

export default SearchEngineActionExecutionPayloadResponseFactory;
