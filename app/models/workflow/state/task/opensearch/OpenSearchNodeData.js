import OpenSearchStateDefinition from './OpenSearchStateDefinition';

class OpenSearchNodeData {
  /**
   * @param {Object} params
   * @param {OpenSearchStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new OpenSearchStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default OpenSearchNodeData;
