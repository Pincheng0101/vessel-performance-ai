import AgentBuiltInToolRead from './AgentBuiltInToolRead';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolReadResponse extends AgentBuiltInToolRead {
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

export default AgentBuiltInToolReadResponse;
