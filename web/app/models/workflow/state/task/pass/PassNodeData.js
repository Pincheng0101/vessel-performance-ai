import PassStateDefinition from './PassStateDefinition';

class PassNodeData {
  /**
   * @param {Object} params
   * @param {PassStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new PassStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default PassNodeData;
