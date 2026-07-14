import AgentBuiltInToolTask from './AgentBuiltInToolTask';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolTaskResponse extends AgentBuiltInToolTask {
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

export default AgentBuiltInToolTaskResponse;
