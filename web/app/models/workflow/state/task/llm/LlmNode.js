import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import LlmNodeData from './LlmNodeData';

class LlmNode extends Node {
  type = StateConstant.ActionType.LLM.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.LLM.nodeHeight,
      width: StateConstant.ActionType.LLM.nodeWidth,
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
    this.data = new LlmNodeData(data);
  }
}

export default LlmNode;
