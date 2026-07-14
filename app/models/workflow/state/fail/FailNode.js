import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import FailNodeData from './FailNodeData';

class FailNode extends Node {
  type = StateConstant.Type.FAIL.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.Type.FAIL.nodeHeight,
      width: StateConstant.Type.FAIL.nodeWidth,
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
    this.data = new FailNodeData(data);
  }
}

export default FailNode;
