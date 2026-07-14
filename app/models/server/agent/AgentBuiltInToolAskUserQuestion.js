import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolAskUserQuestion extends AgentBuiltInTool {
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

export default AgentBuiltInToolAskUserQuestion;
