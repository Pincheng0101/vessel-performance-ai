import LlmStateDefinition from './LlmStateDefinition';

class LlmNodeData {
  /**
   * @param {Object} params
   * @param {LlmStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new LlmStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default LlmNodeData;
