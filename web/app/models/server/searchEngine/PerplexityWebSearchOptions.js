class PerplexityWebSearchOptions {
  constructor({
    searchContextSize,
  } = {}) {
    this.searchContextSize = searchContextSize;
  }

  /**
   * @param {PerplexityWebSearchOptions} webSearchOptions
   */
  static toRequestPayload(webSearchOptions) {
    return {
      search_context_size: webSearchOptions.searchContextSize,
    };
  }
}

export default PerplexityWebSearchOptions;
