import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import McpNodeData from './McpNodeData';

class McpNode extends Node {
  type = StateConstant.ActionType.MCP.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.MCP.nodeHeight,
      width: StateConstant.ActionType.MCP.nodeWidth,
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
    this.data = new McpNodeData(data);
  }
}

export default McpNode;
