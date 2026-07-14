import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import CodeNodeData from './CodeNodeData';

class CodeNode extends Node {
  type = StateConstant.ActionType.CODE.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.CODE.nodeHeight,
      width: StateConstant.ActionType.CODE.nodeWidth,
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
    this.data = new CodeNodeData(data);
  }
}

export default CodeNode;
