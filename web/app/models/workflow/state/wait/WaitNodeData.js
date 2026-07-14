import WaitStateDefinition from './WaitStateDefinition';

class WaitNodeData {
  /**
   * @param {Object} params
   * @param {WaitStateDefinition} params.stateDefinition
   */
  constructor({
    executionStatus,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new WaitStateDefinition(stateDefinition);
  }
}

export default WaitNodeData;
