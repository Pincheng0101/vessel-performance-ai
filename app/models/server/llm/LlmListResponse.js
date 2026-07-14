import LlmResponseFactory from './LlmResponseFactory';

/**
 * @import { LlmResponse } from '~/models/server/llm'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LlmListResponse {
  /**
   * @type {LlmResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.llms.map(LlmResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default LlmListResponse;
