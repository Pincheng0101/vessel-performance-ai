import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolMcpServer extends AgentTool {
  constructor({
    auth,
    description,
    displayName,
    mcpServerId,
    name,
    tags,
    toolType = AgentConstant.ToolType.MCP_SERVER.value,
    trackToolResults,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.auth = auth ?? null;
    this.mcpServerId = mcpServerId;
  }

  get isOauth() {
    return this.auth?.authType === AgentConstant.McpServerToolAuthType.OAUTH.value;
  }

  /**
   * @param {AgentToolMcpServer} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      mcp_server_id: tool.mcpServerId,
    };
  }
}

export default AgentToolMcpServer;
