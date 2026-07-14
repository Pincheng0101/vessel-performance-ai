import RetrievalStateDefinition from './RetrievalStateDefinition';

class RetrievalNodeData {
  /**
   * @param {Object} params
   * @param {RetrievalStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new RetrievalStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default RetrievalNodeData;
