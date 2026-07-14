import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolBrowser extends AgentBuiltInTool {
  constructor({
    enable,
    maxOutputChars,
    maxTimeout,
    trackToolResults,
  } = {}) {
    super({
      enable,
      trackToolResults,
    });
    this.maxOutputChars = maxOutputChars;
    this.maxTimeout = maxTimeout;
  }

  /**
   * @param {AgentBuiltInToolBrowser} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      max_output_chars: tool.maxOutputChars,
      max_timeout: tool.maxTimeout,
    };
  }
}

export default AgentBuiltInToolBrowser;
