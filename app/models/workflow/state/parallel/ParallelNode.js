import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import ParallelNodeData from './ParallelNodeData';

class ParallelNode extends Node {
  type = StateConstant.Type.PARALLEL.value;
  isParent = true;

  constructor({
    data,
    dimensions = {
      height: StateConstant.Type.PARALLEL.nodeHeight,
      width: StateConstant.Type.PARALLEL.nodeWidth,
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
    this.data = new ParallelNodeData(data);
  }
}

export default ParallelNode;
