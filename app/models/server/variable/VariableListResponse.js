import VariableResponseFactory from './VariableResponseFactory';

/**
 * @import { VariableResponse } from '~/models/server/variable'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class VariableListResponse {
  /**
   * @type {VariableResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.variables.map(VariableResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default VariableListResponse;
