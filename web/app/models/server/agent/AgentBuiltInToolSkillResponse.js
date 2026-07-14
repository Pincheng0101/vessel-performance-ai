import AgentBuiltInToolSkill from './AgentBuiltInToolSkill';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolSkillResponse extends AgentBuiltInToolSkill {
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

export default AgentBuiltInToolSkillResponse;
