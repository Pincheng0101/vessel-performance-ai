import ChunkerResponseFactory from './ChunkerResponseFactory';

/**
 * @import { ChunkerResponse } from '~/models/server/chunker'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChunkerListResponse {
  /**
   * @type {ChunkerResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.chunkers.map(ChunkerResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default ChunkerListResponse;
