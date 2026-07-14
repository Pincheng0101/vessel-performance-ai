import StartSyncWorkflowExecutionStateDefinition from './StartSyncWorkflowExecutionStateDefinition';

class StartSyncWorkflowExecutionNodeData {
  /**
   * @param {Object} params
   * @param {StartSyncWorkflowExecutionStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new StartSyncWorkflowExecutionStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default StartSyncWorkflowExecutionNodeData;
