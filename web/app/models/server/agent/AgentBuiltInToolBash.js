import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolBash extends AgentBuiltInTool {
  constructor({
    blockedCommands,
    enable,
    maxOutputChars,
    maxTimeout,
    trackToolResults,
  } = {}) {
    super({
      enable,
      trackToolResults,
    });
    this.blockedCommands = blockedCommands;
    this.maxOutputChars = maxOutputChars;
    this.maxTimeout = maxTimeout;
  }

  /**
   * @param {AgentBuiltInToolBash} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      blocked_commands: tool.blockedCommands,
      max_output_chars: tool.maxOutputChars,
      max_timeout: tool.maxTimeout,
    };
  }
}

export default AgentBuiltInToolBash;
