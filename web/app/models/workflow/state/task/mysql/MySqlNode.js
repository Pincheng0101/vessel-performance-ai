import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import MySqlNodeData from './MySqlNodeData';

class MySqlNode extends Node {
  type = StateConstant.ActionType.MYSQL.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.MYSQL.nodeHeight,
      width: StateConstant.ActionType.MYSQL.nodeWidth,
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
    this.data = new MySqlNodeData(data);
  }
}

export default MySqlNode;
