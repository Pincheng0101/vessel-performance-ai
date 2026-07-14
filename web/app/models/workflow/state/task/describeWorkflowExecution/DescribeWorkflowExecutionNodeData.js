import DescribeWorkflowExecutionStateDefinition from './DescribeWorkflowExecutionStateDefinition';

class DescribeWorkflowExecutionNodeData {
  /**
   * @param {Object} params
   * @param {DescribeWorkflowExecutionStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new DescribeWorkflowExecutionStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default DescribeWorkflowExecutionNodeData;
