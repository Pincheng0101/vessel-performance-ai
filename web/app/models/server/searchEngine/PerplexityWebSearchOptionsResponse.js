import PerplexityWebSearchOptions from './PerplexityWebSearchOptions';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class PerplexityWebSearchOptionsResponse extends PerplexityWebSearchOptions {
  constructor({
    search_context_size,
  } = {}) {
    super({
      searchContextSize: search_context_size,
    });
  }
}

export default PerplexityWebSearchOptionsResponse;
