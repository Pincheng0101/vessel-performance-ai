import StartWorkflowExecutionStateDefinition from './StartWorkflowExecutionStateDefinition';

class StartWorkflowExecutionNodeData {
  /**
   * @param {Object} params
   * @param {StartWorkflowExecutionStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new StartWorkflowExecutionStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default StartWorkflowExecutionNodeData;
