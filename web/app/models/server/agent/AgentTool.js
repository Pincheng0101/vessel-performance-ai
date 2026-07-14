class AgentTool {
  constructor({
    description,
    displayName,
    name,
    tags,
    toolType,
    trackToolResults,
  } = {}) {
    this.description = description;
    this.displayName = displayName;
    this.name = name;
    this.tags = tags;
    this.toolType = toolType;
    this.trackToolResults = trackToolResults;
  }

  /**
   * @param {AgentTool} tool
   */
  static toRequestPayload(tool) {
    return {
      description: tool.description,
      display_name: tool.displayName,
      name: tool.name,
      tags: tool.tags,
      tool_type: tool.toolType,
      track_tool_results: tool.trackToolResults,
    };
  }
}

export default AgentTool;
