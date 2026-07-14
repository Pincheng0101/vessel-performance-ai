import SearchEngineResponseFactory from './SearchEngineResponseFactory';

/**
 * @import { SearchEngineResponse } from '~/models/server/searchEngine'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class SearchEngineListResponse {
  /**
   * @type {SearchEngineResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.search_engines.map(SearchEngineResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default SearchEngineListResponse;
