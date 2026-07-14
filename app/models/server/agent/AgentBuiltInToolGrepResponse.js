import AgentBuiltInToolGrep from './AgentBuiltInToolGrep';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolGrepResponse extends AgentBuiltInToolGrep {
  constructor({
    enable,
    track_tool_results,
  } = {}) {
    super({
      enable,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentBuiltInToolGrepResponse;
