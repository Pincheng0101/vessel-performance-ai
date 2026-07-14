import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import AgentNodeData from './AgentNodeData';

class AgentNode extends Node {
  type = StateConstant.ActionType.AGENT.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.AGENT.nodeHeight,
      width: StateConstant.ActionType.AGENT.nodeWidth,
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
    this.data = new AgentNodeData(data);
  }
}

export default AgentNode;
