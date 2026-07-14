import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import ChoiceNodeData from './ChoiceNodeData';

class ChoiceNode extends Node {
  type = StateConstant.Type.CHOICE.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.Type.CHOICE.nodeHeight,
      width: StateConstant.Type.CHOICE.nodeWidth,
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
    this.data = new ChoiceNodeData(data);
  }
}

export default ChoiceNode;
