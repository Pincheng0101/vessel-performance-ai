import AgentBuiltInToolAskUserQuestion from './AgentBuiltInToolAskUserQuestion';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolAskUserQuestionResponse extends AgentBuiltInToolAskUserQuestion {
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

export default AgentBuiltInToolAskUserQuestionResponse;
