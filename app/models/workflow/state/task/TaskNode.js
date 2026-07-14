import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import TaskNodeData from './TaskNodeData';

class TaskNode extends Node {
  type = StateConstant.ActionType.UNKNOWN.value;

  constructor({
    data,
    dimensions = {
      height: 68,
      width: 200,
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
    this.data = new TaskNodeData(data);
  }
}

export default TaskNode;
