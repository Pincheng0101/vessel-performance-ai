import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';

class SlotNode extends Node {
  type = StateConstant.PseudoType.SLOT.value;

  constructor({
    data = {},
    dimensions = {
      height: StateConstant.PseudoType.SLOT.nodeHeight,
      width: StateConstant.PseudoType.SLOT.nodeWidth,
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
    this.data = data;
  }
}

export default SlotNode;
