import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import LambdaNodeData from './LambdaNodeData';

class LambdaNode extends Node {
  type = StateConstant.ActionType.LAMBDA.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.LAMBDA.nodeHeight,
      width: StateConstant.ActionType.LAMBDA.nodeWidth,
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
    this.data = new LambdaNodeData(data);
  }
}

export default LambdaNode;
