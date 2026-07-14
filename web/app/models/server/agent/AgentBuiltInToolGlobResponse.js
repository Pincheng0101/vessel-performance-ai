import AgentBuiltInToolGlob from './AgentBuiltInToolGlob';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolGlobResponse extends AgentBuiltInToolGlob {
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

export default AgentBuiltInToolGlobResponse;
