import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import PassNodeData from './PassNodeData';

class PassNode extends Node {
  type = StateConstant.ActionType.PASS.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.PASS.nodeHeight,
      width: StateConstant.ActionType.PASS.nodeWidth,
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
    this.data = new PassNodeData(data);
  }
}

export default PassNode;
