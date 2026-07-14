import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import TransformationNodeData from './TransformationNodeData';

class TransformationNode extends Node {
  type = StateConstant.ActionType.TRANSFORMATION.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.TRANSFORMATION.nodeHeight,
      width: StateConstant.ActionType.TRANSFORMATION.nodeWidth,
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
    this.data = new TransformationNodeData(data);
  }
}

export default TransformationNode;
