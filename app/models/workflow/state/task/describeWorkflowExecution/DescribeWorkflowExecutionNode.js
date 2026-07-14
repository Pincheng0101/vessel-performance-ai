import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import DescribeWorkflowExecutionNodeData from './DescribeWorkflowExecutionNodeData';

class DescribeWorkflowExecutionNode extends Node {
  type = StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.nodeHeight,
      width: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.nodeWidth,
    },
    id,
    parentNode,
    position,
    hidden,
  } = {}) {
    super({
      dimensions,
      id,
      parentNode,
      position,
      hidden,
    });
    this.data = new DescribeWorkflowExecutionNodeData(data);
  }
}

export default DescribeWorkflowExecutionNode;
