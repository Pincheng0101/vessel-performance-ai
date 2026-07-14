import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import MapNodeData from './MapNodeData';

class MapNode extends Node {
  type = StateConstant.Type.MAP.value;
  isParent = true;

  constructor({
    data,
    dimensions = {
      height: StateConstant.Type.MAP.nodeHeight,
      width: StateConstant.Type.MAP.nodeWidth,
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
    this.data = new MapNodeData(data);
  }
}

export default MapNode;
