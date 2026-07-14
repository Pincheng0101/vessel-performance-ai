class ValidateAgentTools {
  constructor({
    agentId,
    toolRuntimeConfig,
  } = {}) {
    this.agentId = agentId;
    this.toolRuntimeConfig = toolRuntimeConfig ?? {};
  }

  /**
   * @param {ValidateAgentTools} request
   */
  static toRequestPayload(request) {
    return {
      agent_id: request.agentId,
      tool_runtime_config: request.toolRuntimeConfig,
    };
  }
}

export default ValidateAgentTools;
