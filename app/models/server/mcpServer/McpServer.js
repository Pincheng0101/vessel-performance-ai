import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class McpServer extends Resource {
  constructor({
    endpointUrl,
    mcpServerId,
    mcpServerName,
    mcpServerType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.endpointUrl = endpointUrl ?? '';
    this.mcpServerId = mcpServerId ?? '';
    this.mcpServerName = mcpServerName ?? '';
    this.mcpServerType = mcpServerType ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.MCP_SERVER.value;
  }

  get id() {
    return this.mcpServerId;
  }

  get name() {
    return this.mcpServerName;
  }

  get type() {
    return this.mcpServerType;
  }

  /**
   * @param {McpServer} resource
   */
  static toRequestPayload(resource) {
    return {
      mcp_server_id: resource.mcpServerId,
      mcp_server_name: resource.mcpServerName,
      mcp_server_type: resource.mcpServerType,
    };
  }
}

export default McpServer;
