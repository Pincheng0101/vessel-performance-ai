import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolReadUrl extends AgentBuiltInTool {
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

export default AgentBuiltInToolReadUrl;
