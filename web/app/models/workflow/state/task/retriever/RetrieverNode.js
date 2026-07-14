import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import RetrieverNodeData from './RetrieverNodeData';

class RetrieverNode extends Node {
  type = StateConstant.ActionType.RETRIEVER.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.RETRIEVER.nodeHeight,
      width: StateConstant.ActionType.RETRIEVER.nodeWidth,
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
    this.data = new RetrieverNodeData(data);
  }
}

export default RetrieverNode;
