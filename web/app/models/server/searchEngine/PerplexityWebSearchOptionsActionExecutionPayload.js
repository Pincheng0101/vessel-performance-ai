class PerplexityWebSearchOptionsActionExecutionPayload {
  constructor({
    searchContextSize,
  } = {}) {
    this.searchContextSize = searchContextSize;
  }

  /**
   * @param {PerplexityWebSearchOptionsActionExecutionPayload} webSearchOptions
   */
  static toRequestPayload(webSearchOptions) {
    return {
      search_context_size: webSearchOptions?.searchContextSize,
    };
  }
}

export default PerplexityWebSearchOptionsActionExecutionPayload;
