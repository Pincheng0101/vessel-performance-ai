import ParallelStateDefinition from './ParallelStateDefinition';

class ParallelNodeData {
  /**
   * @param {Object} params
   * @param {ParallelStateDefinition} params.stateDefinition
   */
  constructor({
    executionStatus,
    isCollapsed = false,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isCollapsed = isCollapsed;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new ParallelStateDefinition(stateDefinition);
  }
}

export default ParallelNodeData;
