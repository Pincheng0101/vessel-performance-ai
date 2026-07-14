class OpenAiWebSearchOptionsActionExecutionPayload {
  constructor({
    searchContextSize,
    userLocationCountry,
    userLocationRegion,
    userLocationCity,
  } = {}) {
    this.searchContextSize = searchContextSize;
    this.userLocationCountry = userLocationCountry;
    this.userLocationRegion = userLocationRegion;
    this.userLocationCity = userLocationCity;
  }

  /**
   * @param {OpenAiWebSearchOptionsActionExecutionPayload} webSearchOptions
   */
  static toRequestPayload(webSearchOptions) {
    return {
      search_context_size: webSearchOptions?.searchContextSize,
      user_location_country: webSearchOptions?.userLocationCountry,
      user_location_region: webSearchOptions?.userLocationRegion,
      user_location_city: webSearchOptions?.userLocationCity,
    };
  }
}

export default OpenAiWebSearchOptionsActionExecutionPayload;
