/**
 * @import { Edge, Node } from '~/models/workflow'
 */

class NodeConnection {
  constructor({
    fallbackEdges = [],
    fallbackFromEdges = [],
    fallbackFromNodes = [],
    fallbackNodes = [],
    nextEdges = [],
    nextNodes = [],
    nodeType = '',
    previousEdges = [],
    previousNodes = [],
  } = {}) {
    /**
     * @type {Edge[]}
     */
    this.fallbackEdges = fallbackEdges;
    /**
     * @type {Edge[]}
     */
    this.fallbackFromEdges = fallbackFromEdges;
    /**
     * @type {Node[]}
     */
    this.fallbackFromNodes = fallbackFromNodes;
    /**
     * @type {Node[]}
     */
    this.fallbackNodes = fallbackNodes;
    /**
     * @type {Edge[]}
     */
    this.nextEdges = nextEdges;
    /**
     * @type {Node[]}
     */
    this.nextNodes = nextNodes;
    this.nodeType = nodeType;
    /**
     * @type {Edge[]}
     */
    this.previousEdges = previousEdges;
    /**
     * @type {Node[]}
     */
    this.previousNodes = previousNodes;
  }
}

export default NodeConnection;
