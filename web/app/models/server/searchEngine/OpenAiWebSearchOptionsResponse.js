import OpenAiWebSearchOptions from './OpenAiWebSearchOptions';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenAiWebSearchOptionsResponse extends OpenAiWebSearchOptions {
  constructor({
    search_context_size,
    user_location_country,
    user_location_region,
    user_location_city,
  } = {}) {
    super({
      searchContextSize: search_context_size,
      userLocationCountry: user_location_country,
      userLocationRegion: user_location_region,
      userLocationCity: user_location_city,
    });
  }
}

export default OpenAiWebSearchOptionsResponse;
