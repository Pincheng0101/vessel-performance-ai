import AgentBuiltInToolBash from './AgentBuiltInToolBash';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolBashResponse extends AgentBuiltInToolBash {
  constructor({
    blocked_commands,
    enable,
    max_output_chars,
    max_timeout,
    track_tool_results,
  } = {}) {
    super({
      blockedCommands: blocked_commands,
      enable,
      maxOutputChars: max_output_chars,
      maxTimeout: max_timeout,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentBuiltInToolBashResponse;
