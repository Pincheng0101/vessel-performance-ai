import AgentBuiltInToolWrite from './AgentBuiltInToolWrite';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolWriteResponse extends AgentBuiltInToolWrite {
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

export default AgentBuiltInToolWriteResponse;
