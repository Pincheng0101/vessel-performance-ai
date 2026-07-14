import AgentToolSkill from './AgentToolSkill';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolSkillResponse extends AgentToolSkill {
  constructor({
    description,
    display_name,
    name,
    skill_id,
    tags,
    tool_type,
    track_tool_results,
  } = {}) {
    super({
      description,
      displayName: display_name,
      name,
      skillId: skill_id,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolSkillResponse;
