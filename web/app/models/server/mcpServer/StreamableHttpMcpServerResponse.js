import McpServerAuthResponse from './McpServerAuthResponse';
import StreamableHttpMcpServer from './StreamableHttpMcpServer';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StreamableHttpMcpServerResponse extends StreamableHttpMcpServer {
  constructor({
    auth,
    endpoint_url,
    mcp_server_id,
    mcp_server_name,
    mcp_server_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      auth: auth ? new McpServerAuthResponse(auth) : null,
      endpointUrl: endpoint_url,
      mcpServerId: mcp_server_id,
      mcpServerName: mcp_server_name,
      mcpServerType: mcp_server_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default StreamableHttpMcpServerResponse;
