import AgentBuiltInToolCode from './AgentBuiltInToolCode';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolCodeResponse extends AgentBuiltInToolCode {
  constructor({
    enable,
    runtime_type,
    track_tool_results,
  } = {}) {
    super({
      enable,
      runtimeType: runtime_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentBuiltInToolCodeResponse;
