import Skill from './Skill';

class SkillResponse extends Skill {
  constructor({
    description,
    skill_id,
    skill_markdown,
    skill_name,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      description,
      skillId: skill_id,
      skillMarkdown: skill_markdown,
      skillName: skill_name,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default SkillResponse;
