import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import RankerNodeData from './RankerNodeData';

class RankerNode extends Node {
  type = StateConstant.ActionType.RANKER.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.RANKER.nodeHeight,
      width: StateConstant.ActionType.RANKER.nodeWidth,
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
    this.data = new RankerNodeData(data);
  }
}

export default RankerNode;
