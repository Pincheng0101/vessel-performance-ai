import McpServerCustomTool from './McpServerCustomTool';

class AgentMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    agentId,
    customToolType,
    description,
    name,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.agentId = agentId ?? '';
  }

  /**
   * @param {AgentMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      agent_id: resource.agentId,
    };
  }
}

export default AgentMcpServerCustomTool;
