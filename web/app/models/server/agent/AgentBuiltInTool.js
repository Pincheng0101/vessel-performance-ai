class AgentBuiltInTool {
  constructor({
    enable,
    trackToolResults,
  } = {}) {
    this.enable = enable;
    this.trackToolResults = trackToolResults;
  }

  /**
   * @param {AgentBuiltInTool} tool
   */
  static toRequestPayload(tool) {
    return {
      enable: tool.enable,
      track_tool_results: tool.trackToolResults,
    };
  }
}

export default AgentBuiltInTool;
