import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import ReadUrlNodeData from './ReadUrlNodeData';

class ReadUrlNode extends Node {
  type = StateConstant.ActionType.READ_URL.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.READ_URL.nodeHeight,
      width: StateConstant.ActionType.READ_URL.nodeWidth,
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
    this.data = new ReadUrlNodeData(data);
  }
}

export default ReadUrlNode;
