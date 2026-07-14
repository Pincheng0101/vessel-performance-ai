import AgentToolMcpServer from './AgentToolMcpServer';
import AgentToolMcpServerOauthResponse from './AgentToolMcpServerOauthResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolMcpServerResponse extends AgentToolMcpServer {
  constructor({
    auth,
    description,
    display_name,
    name,
    mcp_server_id,
    tags,
    track_tool_results,
    tool_type,
  } = {}) {
    super({
      auth: auth ? new AgentToolMcpServerOauthResponse(auth) : null,
      description,
      displayName: display_name,
      mcpServerId: mcp_server_id,
      name,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolMcpServerResponse;
