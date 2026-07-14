import { AgentConstant } from '~/constants';

class AgentMetadata {
  constructor({
    agentBuilderType,
    createMode,
  } = {}) {
    this.agentBuilderType = agentBuilderType ?? null;
    this.createMode = createMode ?? null;
  }

  static getUiDataKey(agentId) {
    return `metadata-${agentId}`;
  }

  get isCreatedFromAgentBuilder() {
    return this.createMode === AgentConstant.CreateMode.FROM_AGENT_BUILDER.value;
  }
}

export default AgentMetadata;
