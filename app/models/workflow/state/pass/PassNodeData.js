import PassStateDefinition from './PassStateDefinition';

class PassNodeData {
  /**
   * @param {Object} params
   * @param {PassStateDefinition} params.stateDefinition
   */
  constructor({
    executionStatus,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new PassStateDefinition(stateDefinition);
  }
}

export default PassNodeData;
