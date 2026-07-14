import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import RetrievalNodeData from './RetrievalNodeData';

class RetrievalNode extends Node {
  type = StateConstant.ActionType.RETRIEVAL.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.RETRIEVAL.nodeHeight,
      width: StateConstant.ActionType.RETRIEVAL.nodeWidth,
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
    this.data = new RetrievalNodeData(data);
  }
}

export default RetrievalNode;
