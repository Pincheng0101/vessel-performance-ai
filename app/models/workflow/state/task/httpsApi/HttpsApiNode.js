import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import HttpsApiNodeData from './HttpsApiNodeData';

class HttpsApiNode extends Node {
  type = StateConstant.ActionType.HTTPS_API.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.HTTPS_API.nodeHeight,
      width: StateConstant.ActionType.HTTPS_API.nodeWidth,
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
    this.data = new HttpsApiNodeData(data);
  }
}

export default HttpsApiNode;
