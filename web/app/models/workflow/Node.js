class Node {
  constructor({
    dimensions = {
      height: 0,
      width: 0,
    },
    id,
    isParent,
    parentNode,
    position = {
      x: 0,
      y: 0,
    },
    type,
    hidden = false,
  } = {}) {
    this.dimensions = dimensions;
    this.id = id;
    this.isParent = isParent;
    this.parentNode = parentNode;
    this.position = position;
    this.type = type;
    this.hidden = hidden;
  }
}

export default Node;
