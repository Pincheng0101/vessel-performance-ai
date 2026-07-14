import TaskStateDefinition from './TaskStateDefinition';

class TaskNodeData {
  /**
   * @param {Object} params
   * @param {TaskStateDefinition} params.stateDefinition
   */
  constructor({
    executionStatus,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.stateDefinition = new TaskStateDefinition(stateDefinition);
  }
}

export default TaskNodeData;
