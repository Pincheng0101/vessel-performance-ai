import { StateConstant } from '~/constants';
import ChoiceNodeHandler from './ChoiceNodeHandler';
import MapNodeHandler from './MapNodeHandler';
import NodeHandler from './NodeHandler';
import ParallelNodeHandler from './ParallelNodeHandler';

class NodeHandlerFactory {
  static create(payload) {
    switch (payload.type) {
      case StateConstant.Type.CHOICE.value:
        return new ChoiceNodeHandler(payload);
      case StateConstant.Type.MAP.value:
        return new MapNodeHandler(payload);
      case StateConstant.Type.PARALLEL.value:
        return new ParallelNodeHandler(payload);
      default:
        return new NodeHandler(payload);
    }
  }
}

export default NodeHandlerFactory;
