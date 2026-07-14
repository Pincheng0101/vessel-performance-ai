import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolGlob extends AgentBuiltInTool {
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

export default AgentBuiltInToolGlob;
