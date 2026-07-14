import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolGrep extends AgentBuiltInTool {
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

export default AgentBuiltInToolGrep;
