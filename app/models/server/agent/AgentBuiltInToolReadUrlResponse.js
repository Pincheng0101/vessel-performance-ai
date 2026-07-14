import AgentBuiltInToolReadUrl from './AgentBuiltInToolReadUrl';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolReadUrlResponse extends AgentBuiltInToolReadUrl {
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

export default AgentBuiltInToolReadUrlResponse;
