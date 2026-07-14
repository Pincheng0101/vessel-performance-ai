import AgentBuiltInTool from './AgentBuiltInTool';

class AgentBuiltInToolTask extends AgentBuiltInTool {
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

export default AgentBuiltInToolTask;
