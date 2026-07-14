import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';
import SearchEngineNodeData from './SearchEngineNodeData';

class SearchEngineNode extends Node {
  type = StateConstant.ActionType.SEARCH_ENGINE.value;

  constructor({
    data,
    dimensions = {
      height: StateConstant.ActionType.SEARCH_ENGINE.nodeHeight,
      width: StateConstant.ActionType.SEARCH_ENGINE.nodeWidth,
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
    this.data = new SearchEngineNodeData(data);
  }
}

export default SearchEngineNode;
