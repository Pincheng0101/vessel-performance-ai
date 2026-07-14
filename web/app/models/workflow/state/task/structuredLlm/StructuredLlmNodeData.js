import StructuredLlmStateDefinition from './StructuredLlmStateDefinition';

class StructuredLlmNodeData {
  /**
   * @param {Object} params
   * @param {StructuredLlmStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new StructuredLlmStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default StructuredLlmNodeData;
