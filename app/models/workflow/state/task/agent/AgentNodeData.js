import AgentStateDefinition from './AgentStateDefinition';

class AgentNodeData {
  /**
   * @param {Object} params
   * @param {AgentStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new AgentStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default AgentNodeData;
