import LoaderResponseFactory from './LoaderResponseFactory';

/**
 * @import { LoaderResponse } from '~/models/server/loader'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LoaderListResponse {
  /**
   * @type {LoaderResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.loaders.map(LoaderResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default LoaderListResponse;
