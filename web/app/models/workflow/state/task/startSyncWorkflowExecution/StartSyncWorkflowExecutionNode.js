import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import StartSyncWorkflowExecutionNodeData from './StartSyncWorkflowExecutionNodeData';

class StartSyncWorkflowExecutionNode extends Node {
  type = StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.nodeHeight,
      width: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.nodeWidth,
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
    this.data = new StartSyncWorkflowExecutionNodeData(data);
  }
}

export default StartSyncWorkflowExecutionNode;
