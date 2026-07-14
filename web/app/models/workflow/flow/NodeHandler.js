import { Edge, NodeFactory } from '~/models/workflow';
import { StateDefinition } from '~/models/workflow/state';
import { EndNode } from '~/models/workflow/state/end';
import { SlotNode } from '~/models/workflow/state/slot';
import { StartNode } from '~/models/workflow/state/start';

class NodeHandler {
  /**
   * @param {Object} params
   * @param {string} params.type
   */
  constructor({
    type,
    addEdges,
    addNodes,
    edges,
    updateEdge,
  } = {}) {
    this.type = type;
    this.addEdges = addEdges;
    this.addNodes = addNodes;
    this.edges = edges;
    this.updateEdge = updateEdge;
  }

  createPlaceholders({
    parentNode,
    startNodeId,
    endNodeId,
  } = {}) {
    const startNode = new StartNode({
      id: startNodeId || strUtils.uuid(),
      parentNode,
    });
    const endNode = new EndNode({
      id: endNodeId || strUtils.uuid(),
      parentNode,
    });
    const slotNode = new SlotNode({
      id: strUtils.uuid(),
      parentNode,
    });
    const startEdge = new Edge({
      id: strUtils.uuid(),
      source: startNode.id,
      target: slotNode.id,
    });
    const endEdge = new Edge({
      id: strUtils.uuid(),
      source: slotNode.id,
      target: endNode.id,
    });
    return {
      startNode,
      endNode,
      slotNode,
      startEdge,
      endEdge,
    };
  }

  replaceSlotNode({
    id,
    data,
    stateDefinitionName,
    parentNode,
    previousEdges = [],
    nextEdges = [],
    fallbackEdges: originalFallbackEdges = [],
  } = {}) {
    const node = NodeFactory.create({
      id,
      data: data || {
        stateDefinition: new StateDefinition({
          name: stateDefinitionName,
        }),
      },
      parentNode,
      type: this.type,
    });
    nextEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        source: node.id,
        sourceNode: node,
      });
    });
    previousEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        target: node.id,
        targetNode: node,
      });
    });
    const fallbackEdges = [];
    originalFallbackEdges.forEach((edge) => {
      const newEdgeId = strUtils.uuid();
      fallbackEdges.push(new Edge({
        ...edge,
        id: newEdgeId,
        source: node.id,
        sourceHandle: newEdgeId,
      }));
      const catches = node.data.stateDefinition.errorHandling.catches;
      catches.forEach((c) => {
        if (c.id === edge.id) c.id = newEdgeId;
      });
    });
    this.addNodes([node]);
    this.addEdges(fallbackEdges);
  }

  addNodeBetweenEdges({
    id,
    data,
    stateDefinitionName,
    parentNode,
    target,
    fallbackEdges: originalFallbackEdges = [],
  } = {}) {
    const node = NodeFactory.create({
      id,
      data: data || {
        stateDefinition: new StateDefinition({
          name: stateDefinitionName,
        }),
      },
      parentNode,
      type: this.type,
    });
    const connectionEdge = new Edge({
      id: strUtils.uuid(),
      source: node.id,
      target,
    });
    const fallbackEdges = [];
    originalFallbackEdges.forEach((edge) => {
      const newEdgeId = strUtils.uuid();
      fallbackEdges.push(new Edge({
        ...edge,
        id: newEdgeId,
        source: node.id,
        sourceHandle: newEdgeId,
      }));
      const catches = node.data.stateDefinition.errorHandling.catches;
      catches.forEach((c) => {
        if (c.id === edge.id) c.id = newEdgeId;
      });
    });
    this.addNodes([node]);
    this.addEdges([connectionEdge, ...fallbackEdges]);
  }
}

export default NodeHandler;
