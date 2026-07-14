import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import StartWorkflowExecutionNodeData from './StartWorkflowExecutionNodeData';

class StartWorkflowExecutionNode extends Node {
  type = StateConstant.ActionType.START_WORKFLOW_EXECUTION.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.START_WORKFLOW_EXECUTION.nodeHeight,
      width: StateConstant.ActionType.START_WORKFLOW_EXECUTION.nodeWidth,
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
    this.data = new StartWorkflowExecutionNodeData(data);
  }
}

export default StartWorkflowExecutionNode;
