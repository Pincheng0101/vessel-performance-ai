import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolRead extends AgentBuiltInTool {
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

export default AgentBuiltInToolRead;
