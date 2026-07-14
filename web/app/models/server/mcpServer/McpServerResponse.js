import McpServer from './McpServer';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerResponse extends McpServer {
  constructor({
    endpoint_url,
    mcp_server_id,
    mcp_server_name,
    mcp_server_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
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

export default McpServerResponse;
