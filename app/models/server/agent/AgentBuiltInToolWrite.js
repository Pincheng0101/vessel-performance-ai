import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolWrite extends AgentBuiltInTool {
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

export default AgentBuiltInToolWrite;
