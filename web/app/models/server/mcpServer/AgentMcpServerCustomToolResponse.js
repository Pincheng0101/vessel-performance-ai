import AgentMcpServerCustomTool from './AgentMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentMcpServerCustomToolResponse extends AgentMcpServerCustomTool {
  constructor({
    agent_id,
    custom_tool_type,
    description,
    name,
  } = {}) {
    super({
      agentId: agent_id,
      customToolType: custom_tool_type,
      description,
      name,
    });
  }
}

export default AgentMcpServerCustomToolResponse;
