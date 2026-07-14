import RetrieverResponseFactory from './RetrieverResponseFactory';

/**
 * @import { RetrieverResponse } from '~/models/server/retriever'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class RetrieverListResponse {
  /**
   * @type {RetrieverResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.retrievers.map(RetrieverResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default RetrieverListResponse;
