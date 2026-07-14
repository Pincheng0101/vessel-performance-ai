import CustomMcpServer from './CustomMcpServer';
import McpServerCustomToolResponseFactory from './McpServerCustomToolResponseFactory';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class CustomMcpServerResponse extends CustomMcpServer {
  constructor({
    custom_tools,
    endpoint_url,
    mcp_server_id,
    mcp_server_name,
    mcp_server_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      customTools: custom_tools?.map(tool => McpServerCustomToolResponseFactory.create(tool)),
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

export default CustomMcpServerResponse;
