import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import EndNodeData from './EndNodeData';

class EndNode extends Node {
  type = StateConstant.PseudoType.END.value;

  constructor({
    data,
    dimensions,
    id,
    parentNode,
    position,
    hidden,
  } = {}) {
    if (!dimensions) {
      dimensions = parentNode
        ? {
            height: StateConstant.PseudoType.END.compactHeight,
            width: StateConstant.PseudoType.END.compactWidth,
          }
        : {
            height: StateConstant.PseudoType.END.nodeHeight,
            width: StateConstant.PseudoType.END.nodeWidth,
          };
    }
    super({
      dimensions,
      id,
      parentNode,
      position,
      hidden,
    });
    this.data = new EndNodeData({
      ...data,
    });
  }
}

export default EndNode;
