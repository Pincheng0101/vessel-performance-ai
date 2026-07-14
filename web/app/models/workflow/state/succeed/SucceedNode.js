import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import SucceedNodeData from './SucceedNodeData';

class SucceedNode extends Node {
  type = StateConstant.Type.SUCCEED.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.Type.SUCCEED.nodeHeight,
      width: StateConstant.Type.SUCCEED.nodeWidth,
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
    this.data = new SucceedNodeData(data);
  }
}

export default SucceedNode;
