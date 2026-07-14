import { StateConstant } from '~/constants';
import { Edge } from '~/models/workflow';
import { Flow } from '~/models/workflow/flow';
import { EndNode } from '~/models/workflow/state/end';
import {
  MapNode,
  MapNodeData,
  MapStateDefinition,
} from '~/models/workflow/state/map';
import { SlotNode } from '~/models/workflow/state/slot';
import { StartNode } from '~/models/workflow/state/start';
import NodeHandler from './NodeHandler';

class MapNodeHandler extends NodeHandler {
  constructor({
    addEdges,
    addNodes,
    edges,
    updateEdge,
  } = {}) {
    super({
      type: StateConstant.Type.MAP.value,
      addEdges,
      addNodes,
      edges,
      updateEdge,
    });
  }

  createMapGroup({
    id,
    data,
    stateDefinitionName,
    parentNode,
    originalFallbackEdges = [],
  } = {}) {
    const startNode = new StartNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const endNode = new EndNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const slotNode = new SlotNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const mapNode = new MapNode({
      id,
      parentNode,
      data: data || new MapNodeData({
        stateDefinition: new MapStateDefinition({
          name: stateDefinitionName,
        }),
      }),
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

    const childNodes = [];
    const childEdges = [];
    const stateDefinition = data?.stateDefinition;
    if (stateDefinition?.itemProcessor?.states?.length) {
      const flow = new Flow();
      flow.build({
        startAt: stateDefinition.itemProcessor.startAt,
        states: stateDefinition.itemProcessor.states,
        parentNode: id,
      });
      childNodes.push(...flow.nodes);
      childEdges.push(...flow.edges);
    } else {
      childNodes.push(startNode, slotNode, endNode);
      childEdges.push(startEdge, endEdge);
    }

    const fallbackEdges = [];
    originalFallbackEdges.forEach((edge) => {
      const newEdgeId = strUtils.uuid();
      fallbackEdges.push(new Edge({
        ...edge,
        id: newEdgeId,
        source: mapNode.id,
        sourceHandle: newEdgeId,
      }));
      const catches = mapNode.data.stateDefinition.errorHandling.catches;
      catches.forEach((c) => {
        if (c.id === edge.id) c.id = newEdgeId;
      });
    });

    return {
      mapNode,
      childNodes,
      childEdges,
      fallbackEdges,
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
    const {
      mapNode,
      childNodes,
      childEdges,
      fallbackEdges,
    } = this.createMapGroup({
      id,
      data,
      stateDefinitionName,
      parentNode,
      originalFallbackEdges,
    });
    nextEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        source: mapNode.id,
        sourceNode: mapNode,
      });
    });
    previousEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        target: mapNode.id,
        targetNode: mapNode,
      });
    });
    this.addNodes([mapNode, ...childNodes]);
    this.addEdges([...childEdges, ...fallbackEdges]);
  }

  addNodeBetweenEdges({
    id,
    data,
    stateDefinitionName,
    parentNode,
    target,
    fallbackEdges: originalFallbackEdges = [],
  } = {}) {
    const {
      mapNode,
      childNodes,
      childEdges,
      fallbackEdges,
    } = this.createMapGroup({
      id,
      data,
      stateDefinitionName,
      parentNode,
      originalFallbackEdges,
    });
    const connectionEdge = new Edge({
      id: strUtils.uuid(),
      source: mapNode.id,
      target,
    });
    this.addNodes([mapNode, ...childNodes]);
    this.addEdges([connectionEdge, ...childEdges, ...fallbackEdges]);
  }
}

export default MapNodeHandler;
