import { SearchEngineConstant } from '~/constants';

class OpenAiWebSearchOptions {
  constructor({
    searchContextSize,
    userLocationCountry,
    userLocationRegion,
    userLocationCity,
  } = {}) {
    this.searchContextSize = searchContextSize ?? SearchEngineConstant.SearchContextSize.LOW.value;
    this.userLocationCountry = userLocationCountry ?? null;
    this.userLocationRegion = userLocationRegion ?? null;
    this.userLocationCity = userLocationCity ?? null;
  }

  /**
   * @param {OpenAiWebSearchOptions} webSearchOptions
   */
  static toRequestPayload(webSearchOptions) {
    return {
      search_context_size: webSearchOptions.searchContextSize,
      user_location_country: webSearchOptions.userLocationCountry,
      user_location_region: webSearchOptions.userLocationRegion,
      user_location_city: webSearchOptions.userLocationCity,
    };
  }
}

export default OpenAiWebSearchOptions;
