import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import StartNodeData from './StartNodeData';

class StartNode extends Node {
  type = StateConstant.PseudoType.START.value;

  constructor({
    dimensions,
    data,
    id,
    parentNode,
    position,
    hidden,
  } = {}) {
    if (!dimensions) {
      dimensions = parentNode
        ? {
            height: StateConstant.PseudoType.START.compactHeight,
            width: StateConstant.PseudoType.START.compactWidth,
          }
        : {
            height: StateConstant.PseudoType.START.nodeHeight,
            width: StateConstant.PseudoType.START.nodeWidth,
          };
    }
    super({
      dimensions,
      id,
      parentNode,
      position,
      hidden,
    });
    this.data = new StartNodeData({
      ...data,
    });
  }
}

export default StartNode;
