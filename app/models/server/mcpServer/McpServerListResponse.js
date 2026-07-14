import McpServerResponseFactory from './McpServerResponseFactory';

/**
 * @import { McpServerResponse } from '~/models/server/mcpServer'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerListResponse {
  /**
   * @type {McpServerResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.mcp_servers.map(McpServerResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default McpServerListResponse;
