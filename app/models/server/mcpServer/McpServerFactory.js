import { McpServerConstant } from '~/constants';
import CustomMcpServer from './CustomMcpServer';
import McpServer from './McpServer';
import StreamableHttpMcpServer from './StreamableHttpMcpServer';

class McpServerFactory {
  /**
   * @param {McpServer} payload
   */
  static create(payload) {
    switch (payload.mcpServerType) {
      case McpServerConstant.Type.CUSTOM.value:
        return new CustomMcpServer(payload);
      case McpServerConstant.Type.STREAMABLE_HTTP.value:
        return new StreamableHttpMcpServer(payload);
      default:
        return new McpServer(payload);
    }
  }

  /**
   * @param {McpServer} resource
   */
  static toRequestPayload(resource) {
    switch (resource.mcpServerType) {
      case McpServerConstant.Type.CUSTOM.value:
        return CustomMcpServer.toRequestPayload(resource);
      case McpServerConstant.Type.STREAMABLE_HTTP.value:
        return StreamableHttpMcpServer.toRequestPayload(resource);
      default:
        return McpServer.toRequestPayload(resource);
    }
  }
}

export default McpServerFactory;
