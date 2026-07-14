import { StateConstant } from '~/constants';
import { Edge } from '~/models/workflow';
import { Flow } from '~/models/workflow/flow';
import { EndNode } from '~/models/workflow/state/end';
import {
  ParallelNode,
  ParallelNodeData,
  ParallelStateDefinition,
} from '~/models/workflow/state/parallel';
import { SlotNode } from '~/models/workflow/state/slot';
import { StartNode } from '~/models/workflow/state/start';
import NodeHandler from './NodeHandler';

class ParallelNodeHandler extends NodeHandler {
  constructor({
    addEdges,
    addNodes,
    edges,
    nodes,
    removeEdges,
    removeNodes,
    updateEdge,
  } = {}) {
    super({
      type: StateConstant.Type.PARALLEL.value,
      addEdges,
      addNodes,
      edges,
      updateEdge,
    });
    this.nodes = nodes;
    this.removeEdges = removeEdges;
    this.removeNodes = removeNodes;
  }

  createParallelGroup({
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
    const slotNode1 = new SlotNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const slotNode2 = new SlotNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const endNode1 = new EndNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const endNode2 = new EndNode({
      id: strUtils.uuid(),
      parentNode: id,
    });
    const parallelNode = new ParallelNode({
      id,
      parentNode,
      data: data || new ParallelNodeData({
        stateDefinition: new ParallelStateDefinition({
          name: stateDefinitionName,
        }),
      }),
    });

    const startEdge1 = new Edge({
      id: strUtils.uuid(),
      source: startNode.id,
      target: slotNode1.id,
    });
    const startEdge2 = new Edge({
      id: strUtils.uuid(),
      source: startNode.id,
      target: slotNode2.id,
    });
    const endEdge1 = new Edge({
      id: strUtils.uuid(),
      source: slotNode1.id,
      target: endNode1.id,
    });
    const endEdge2 = new Edge({
      id: strUtils.uuid(),
      source: slotNode2.id,
      target: endNode2.id,
    });

    const childNodes = [];
    const childEdges = [];
    const stateDefinition = data?.stateDefinition;
    const branchesCount = stateDefinition?.branches?.length;
    if (branchesCount) {
      const flow = new Flow();
      stateDefinition.branches.forEach((branch, index) => {
        flow.build({
          startAt: branch.startAt,
          states: branch.states,
          parentNode: id,
          startNodeId: startNode.id,
          createStartNode: index === 0,
          branchIndex: index,
        });
      });
      childNodes.push(...flow.nodes);
      childEdges.push(...flow.edges);
      if (branchesCount === 1) {
        childNodes.push(slotNode1, endNode1);
        childEdges.push(startEdge1, endEdge1);
      }
    } else {
      childNodes.push(startNode, slotNode1, slotNode2, endNode1, endNode2);
      childEdges.push(startEdge1, startEdge2, endEdge1, endEdge2);
    }

    const fallbackEdges = [];
    originalFallbackEdges.forEach((edge) => {
      const newEdgeId = strUtils.uuid();
      fallbackEdges.push(new Edge({
        ...edge,
        id: newEdgeId,
        source: parallelNode.id,
        sourceHandle: newEdgeId,
      }));
      const catches = parallelNode.data.stateDefinition.errorHandling.catches;
      catches.forEach((c) => {
        if (c.id === edge.id) c.id = newEdgeId;
      });
    });

    return {
      parallelNode,
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
      parallelNode,
      childNodes,
      childEdges,
      fallbackEdges,
    } = this.createParallelGroup({
      id,
      data,
      stateDefinitionName,
      parentNode,
      originalFallbackEdges,
    });
    nextEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        source: parallelNode.id,
        sourceNode: parallelNode,
      });
    });
    previousEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        target: parallelNode.id,
        targetNode: parallelNode,
      });
    });
    this.addNodes([parallelNode, ...childNodes]);
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
      parallelNode,
      childNodes,
      childEdges,
      fallbackEdges,
    } = this.createParallelGroup({
      id,
      data,
      stateDefinitionName,
      parentNode,
      originalFallbackEdges,
    });
    const connectionEdge = new Edge({
      id: strUtils.uuid(),
      source: parallelNode.id,
      target,
    });
    this.addNodes([parallelNode, ...childNodes]);
    this.addEdges([connectionEdge, ...childEdges, ...fallbackEdges]);
  }

  createBranch({
    parallelNodeId,
  } = {}) {
    const slotNode = new SlotNode({
      id: strUtils.uuid(),
      parentNode: parallelNodeId,
    });
    const startNode = this.nodes.find(node => node.parentNode === parallelNodeId && node.type === StateConstant.PseudoType.START.value);
    const endNode = new EndNode({
      id: strUtils.uuid(),
      parentNode: parallelNodeId,
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
    this.addNodes([slotNode, endNode]);
    this.addEdges([startEdge, endEdge]);
  }

  clearEmptyBranches({
    parallelNodeId,
  } = {}) {
    const parallelNode = this.nodes.find(node => node.id === parallelNodeId);
    const branches = parallelNode.data.stateDefinition.branches;

    const slotsToKeepCount = branches.length >= 2 ? 0 : branches.length === 1 ? 1 : 2;

    const slotNodeIds = this.nodes
      .filter(node => node.parentNode === parallelNodeId && node.type === StateConstant.PseudoType.SLOT.value)
      .map(node => node.id);
    if (slotNodeIds.length <= slotsToKeepCount) return;

    const startEdges = this.edges.filter(edge => slotNodeIds.includes(edge.target));
    const endEdges = this.edges.filter(edge => slotNodeIds.includes(edge.source));
    const slotsToKeep = slotNodeIds.slice(0, slotsToKeepCount);
    const edgesToKeep = [...startEdges.filter(edge => slotsToKeep.includes(edge.target)), ...endEdges.filter(edge => slotsToKeep.includes(edge.source))];

    const endNodesToRemove = endEdges
      .filter(edge => !slotsToKeep.includes(edge.source))
      .map(edge => edge.target);
    const slotNodesToRemove = slotNodeIds.slice(slotsToKeepCount);
    const edgeIdsToRemove = [...startEdges, ...endEdges].filter(edge => !edgesToKeep.includes(edge)).map(edge => edge.id);
    this.removeEdges(edgeIdsToRemove);
    this.removeNodes([...slotNodesToRemove, ...endNodesToRemove]);
  }
}

export default ParallelNodeHandler;
