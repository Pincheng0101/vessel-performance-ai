import FailStateDefinition from './FailStateDefinition';

class FailNodeData {
  /**
   * @param {Object} params
   * @param {FailStateDefinition} params.stateDefinition
   */
  constructor({
    executionStatus,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new FailStateDefinition(stateDefinition);
  }
}

export default FailNodeData;
