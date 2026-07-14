import RetrieverStateDefinition from './RetrieverStateDefinition';

class RetrieverNodeData {
  /**
   * @param {Object} params
   * @param {RetrieverStateDefinition} params.stateDefinition
   * @param {RetrieverDisplayFields} params.displayFields
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new RetrieverStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default RetrieverNodeData;
