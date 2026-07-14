import PerplexityWebSearchOptionsActionExecutionPayload from './PerplexityWebSearchOptionsActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class PerplexityWebSearchOptionsActionExecutionPayloadResponse extends PerplexityWebSearchOptionsActionExecutionPayload {
  constructor({
    search_context_size,
  } = {}) {
    super({
      searchContextSize: search_context_size,
    });
  }
}

export default PerplexityWebSearchOptionsActionExecutionPayloadResponse;
