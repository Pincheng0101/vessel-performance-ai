import AgentBuiltInToolBrowser from './AgentBuiltInToolBrowser';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolBrowserResponse extends AgentBuiltInToolBrowser {
  constructor({
    enable,
    max_output_chars,
    max_timeout,
    track_tool_results,
  } = {}) {
    super({
      enable,
      maxOutputChars: max_output_chars,
      maxTimeout: max_timeout,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentBuiltInToolBrowserResponse;
