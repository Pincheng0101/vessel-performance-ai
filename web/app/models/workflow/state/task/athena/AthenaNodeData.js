import AthenaStateDefinition from './AthenaStateDefinition';

class AthenaNodeData {
  /**
   * @param {Object} params
   * @param {AthenaStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new AthenaStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default AthenaNodeData;
