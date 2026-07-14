import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolCode extends AgentBuiltInTool {
  constructor({
    enable,
    runtimeType,
    trackToolResults,
  } = {}) {
    super({
      enable,
      trackToolResults,
    });
    this.runtimeType = runtimeType;
  }

  /**
   * @param {AgentBuiltInToolCode} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      runtime_type: tool.runtimeType,
    };
  }
}

export default AgentBuiltInToolCode;
