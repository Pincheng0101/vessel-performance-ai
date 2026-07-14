import ConnectorResponseFactory from './ConnectorResponseFactory';

/**
 * @import { ConnectorResponse } from '~/models/server/connector'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ConnectorListResponse {
  /**
   * @type {ConnectorResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.connectors.map(ConnectorResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default ConnectorListResponse;
