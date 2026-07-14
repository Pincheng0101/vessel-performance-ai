import { SearchEngineConstant } from '~/constants';
import DuckDuckGoSearchEngineResponse from './DuckDuckGoSearchEngineResponse';
import GoogleSearchEngineResponse from './GoogleSearchEngineResponse';
import OpenAiWebSearchEngineResponse from './OpenAiWebSearchEngineResponse';
import PerplexitySearchEngineResponse from './PerplexitySearchEngineResponse';
import SearchEngineResponse from './SearchEngineResponse';

class SearchEngineResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.search_engine_type
   */
  static create(payload) {
    switch (payload.search_engine_type) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return new DuckDuckGoSearchEngineResponse(payload);
      case SearchEngineConstant.Type.GOOGLE.value:
        return new GoogleSearchEngineResponse(payload);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return new PerplexitySearchEngineResponse(payload);
      case SearchEngineConstant.Type.OPENAI.value:
        return new OpenAiWebSearchEngineResponse(payload);
      default:
        return new SearchEngineResponse(payload);
    }
  }
}

export default SearchEngineResponseFactory;
