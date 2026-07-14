import { MarkerType } from '@vue-flow/core';

class MarkerEnd {
  constructor({
    id = strUtils.uuid(),
    type = MarkerType.ArrowClosed,
    width = 20,
    height = 20,
  } = {}) {
    this.id = id;
    this.type = type;
    this.width = width;
    this.height = height;
  }
}

export default MarkerEnd;
