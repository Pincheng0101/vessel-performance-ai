import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import StructuredLlmNodeData from './StructuredLlmNodeData';

class StructuredLlmNode extends Node {
  type = StateConstant.ActionType.STRUCTURED_LLM.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.STRUCTURED_LLM.nodeHeight,
      width: StateConstant.ActionType.STRUCTURED_LLM.nodeWidth,
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
    this.data = new StructuredLlmNodeData(data);
  }
}

export default StructuredLlmNode;
