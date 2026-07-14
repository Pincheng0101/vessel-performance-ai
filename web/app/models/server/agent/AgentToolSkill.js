import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolSkill extends AgentTool {
  constructor({
    description,
    displayName,
    name,
    skillId,
    tags,
    toolType = AgentConstant.ToolType.SKILL.value,
    trackToolResults,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.skillId = skillId;
  }

  /**
   * @param {AgentToolSkill} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      skill_id: tool.skillId,
    };
  }
}

export default AgentToolSkill;
