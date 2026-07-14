import { SearchEngineConstant } from '~/constants';
import DuckDuckGoSearchEngine from './DuckDuckGoSearchEngine';
import GoogleSearchEngine from './GoogleSearchEngine';
import OpenAiWebSearchEngine from './OpenAiWebSearchEngine';
import PerplexitySearchEngine from './PerplexitySearchEngine';
import SearchEngine from './SearchEngine';

class SearchEngineFactory {
  /**
   * @param {SearchEngine} payload
   */
  static create(payload) {
    switch (payload.searchEngineType) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return new DuckDuckGoSearchEngine(payload);
      case SearchEngineConstant.Type.GOOGLE.value:
        return new GoogleSearchEngine(payload);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return new PerplexitySearchEngine(payload);
      case SearchEngineConstant.Type.OPENAI.value:
        return new OpenAiWebSearchEngine(payload);
      default:
        return new SearchEngine(payload);
    }
  }

  /**
   * @param {SearchEngine} resource
   */
  static toRequestPayload(resource) {
    switch (resource.searchEngineType) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return DuckDuckGoSearchEngine.toRequestPayload(resource);
      case SearchEngineConstant.Type.GOOGLE.value:
        return GoogleSearchEngine.toRequestPayload(resource);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return PerplexitySearchEngine.toRequestPayload(resource);
      case SearchEngineConstant.Type.OPENAI.value:
        return OpenAiWebSearchEngine.toRequestPayload(resource);
      default:
        return SearchEngine.toRequestPayload(resource);
    }
  }

  /**
   * @param {SearchEngine} resource
   */
  static toValidateRequestPayload(resource) {
    switch (resource.searchEngineType) {
      case SearchEngineConstant.Type.DUCKDUCKGO.value:
        return DuckDuckGoSearchEngine.toValidateRequestPayload(resource);
      case SearchEngineConstant.Type.GOOGLE.value:
        return GoogleSearchEngine.toValidateRequestPayload(resource);
      case SearchEngineConstant.Type.PERPLEXITY.value:
        return PerplexitySearchEngine.toValidateRequestPayload(resource);
      case SearchEngineConstant.Type.OPENAI.value:
        return OpenAiWebSearchEngine.toValidateRequestPayload(resource);
      default:
        return null;
    }
  }
}

export default SearchEngineFactory;
