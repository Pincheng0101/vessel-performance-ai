import SucceedStateDefinition from './SucceedStateDefinition';

class SucceedNodeData {
  constructor({
    executionStatus,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new SucceedStateDefinition(stateDefinition);
  }
}

export default SucceedNodeData;
