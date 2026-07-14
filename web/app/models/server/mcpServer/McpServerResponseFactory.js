import { McpServerConstant } from '~/constants';
import CustomMcpServerResponse from './CustomMcpServerResponse';
import McpServerResponse from './McpServerResponse';
import StreamableHttpMcpServerResponse from './StreamableHttpMcpServerResponse';

class McpServerResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.mcp_server_type
   */
  static create(payload) {
    switch (payload.mcp_server_type) {
      case McpServerConstant.Type.CUSTOM.value:
        return new CustomMcpServerResponse(payload);
      case McpServerConstant.Type.STREAMABLE_HTTP.value:
        return new StreamableHttpMcpServerResponse(payload);
      default:
        return new McpServerResponse(payload);
    }
  }
}

export default McpServerResponseFactory;
