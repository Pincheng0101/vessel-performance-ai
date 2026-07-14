import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import AthenaNodeData from './AthenaNodeData';

class AthenaNode extends Node {
  type = StateConstant.ActionType.ATHENA.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.ATHENA.nodeHeight,
      width: StateConstant.ActionType.ATHENA.nodeWidth,
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
    this.data = new AthenaNodeData(data);
  }
}

export default AthenaNode;
