import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import TextNodeData from './TextNodeData';

class TextNode extends Node {
  type = StateConstant.ActionType.TEXT.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.TEXT.nodeHeight,
      width: StateConstant.ActionType.TEXT.nodeWidth,
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
    this.data = new TextNodeData(data);
  }
}

export default TextNode;
