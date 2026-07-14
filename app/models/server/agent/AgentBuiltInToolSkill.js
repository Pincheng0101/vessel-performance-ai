import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolSkill extends AgentBuiltInTool {
  constructor({
    enable,
    trackToolResults,
  } = {}) {
    super({
      enable,
      trackToolResults,
    });
  }
}

export default AgentBuiltInToolSkill;
