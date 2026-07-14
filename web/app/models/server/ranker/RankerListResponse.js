import RankerResponseFactory from './RankerResponseFactory';

/**
 * @import { RankerResponse } from '~/models/server/ranker'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class RankerListResponse {
  /**
   * @type {RankerResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.rankers.map(RankerResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default RankerListResponse;
