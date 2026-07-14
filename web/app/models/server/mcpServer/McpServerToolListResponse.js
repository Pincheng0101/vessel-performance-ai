import { McpServerToolResponse } from '~/models/server/mcpServer';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerToolListResponse {
  /**
   * @type {McpServerToolResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.tools.map(tool => new McpServerToolResponse(tool));
  }
}

export default McpServerToolListResponse;
