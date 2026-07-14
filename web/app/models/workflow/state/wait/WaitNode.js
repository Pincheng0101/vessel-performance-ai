import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import WaitNodeData from './WaitNodeData';

class WaitNode extends Node {
  type = StateConstant.Type.WAIT.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.Type.WAIT.nodeHeight,
      width: StateConstant.Type.WAIT.nodeWidth,
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
    this.data = new WaitNodeData(data);
  }
}

export default WaitNode;
