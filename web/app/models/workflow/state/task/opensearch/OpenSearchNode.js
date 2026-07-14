import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import OpenSearchNodeData from './OpenSearchNodeData';

class OpenSearchNode extends Node {
  type = StateConstant.ActionType.OPENSEARCH.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.OPENSEARCH.nodeHeight,
      width: StateConstant.ActionType.OPENSEARCH.nodeWidth,
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
    this.data = new OpenSearchNodeData(data);
  }
}

export default OpenSearchNode;
