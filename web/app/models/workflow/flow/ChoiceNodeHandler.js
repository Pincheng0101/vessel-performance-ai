import { StateConstant } from '~/constants';
import { Edge } from '~/models/workflow';
import {
  ChoiceItem,
  ChoiceItemDefinition,
  ChoiceItemEdge,
  ChoiceNode,
  ChoiceNodeData,
  ChoiceStateDefinition,
} from '~/models/workflow/state/choice';
import { SlotNode } from '~/models/workflow/state/slot';
import NodeHandler from './NodeHandler';

class ChoiceNodeHandler extends NodeHandler {
  constructor({
    addEdges,
    addNodes,
    edges,
    findNode,
    findRouteEndNode,
    nodeConnectionMap,
    nodes,
    removeEdges,
    removeNodes,
    updateEdge,
  } = {}) {
    super({
      type: StateConstant.Type.CHOICE.value,
      addEdges,
      addNodes,
      edges,
      updateEdge,
    });
    this.findNode = findNode;
    this.findRouteEndNode = findRouteEndNode;
    this.nodeConnectionMap = nodeConnectionMap;
    this.nodes = nodes;
    this.removeEdges = removeEdges;
    this.removeNodes = removeNodes;
  }

  createChoiceGroup({
    id,
    parentNode,
    stateDefinitionName,
    targetNode,
  } = {}) {
    const slotNodes = [];
    let defaultSlotNodeId = null;
    // Only create default slot node if targetNode is null or targetNode is end node
    if (!targetNode || targetNode.type === StateConstant.PseudoType.END.value) {
      defaultSlotNodeId = strUtils.uuid();
      slotNodes.push(
        new SlotNode({
          id: defaultSlotNodeId,
          parentNode,
        }),
      );
    }

    const nonDefaultSlotNodeId = strUtils.uuid();
    slotNodes.push(
      new SlotNode({
        id: nonDefaultSlotNodeId,
        parentNode,
      }),
    );

    const defaultRuleEdgeId = strUtils.uuid();
    const nonDefaultRuleEdgeId = strUtils.uuid();
    const defaultRuleEdgeSourceHandle = strUtils.uuid();
    const nonDefaultRuleEdgeSourceHandle = strUtils.uuid();
    const rulesEdges = [
      new ChoiceItemEdge({
        id: defaultRuleEdgeId,
        label: '',
        source: id,
        sourceHandle: defaultRuleEdgeSourceHandle,
        target: defaultSlotNodeId || targetNode.id,
      }),
      new ChoiceItemEdge({
        id: nonDefaultRuleEdgeId,
        label: '',
        source: id,
        sourceHandle: nonDefaultRuleEdgeSourceHandle,
        target: nonDefaultSlotNodeId,
      }),
    ];

    const choiceNode = new ChoiceNode({
      id,
      parentNode,
      data: new ChoiceNodeData({
        stateDefinition: new ChoiceStateDefinition({
          name: stateDefinitionName,
          choices: [
            new ChoiceItem({
              id: defaultRuleEdgeId,
              sourceHandle: defaultRuleEdgeSourceHandle,
              isDefault: true,
              stateDefinition: new ChoiceItemDefinition({
                end: true,
              }),
            }),
            new ChoiceItem({
              id: nonDefaultRuleEdgeId,
              sourceHandle: nonDefaultRuleEdgeSourceHandle,
              stateDefinition: new ChoiceItemDefinition({
                end: true,
              }),
            }),
          ],
        }),
      }),
    });

    return {
      defaultSlotNodeId,
      nonDefaultSlotNodeId,
      choiceNode,
      slotNodes,
      rulesEdges,
    };
  }

  replaceSlotNode({
    id,
    stateDefinitionName,
    parentNode,
    previousEdges = [],
    nextEdges = [],
  } = {}) {
    const {
      choiceNode,
      slotNodes,
      rulesEdges,
    } = this.createChoiceGroup({
      id,
      stateDefinitionName,
      parentNode,
    });
    const newEdges = [...rulesEdges];
    nextEdges.forEach((edge) => {
      slotNodes.forEach((slot, i) => {
        if (i === 0) {
          this.updateEdge({
            ...edge,
            source: slot.id,
            sourceNode: slot,
          });
          return;
        }
        newEdges.push(
          new Edge({
            id: strUtils.uuid(),
            source: slot.id,
            sourceNode: slot,
            target: edge.target,
            targetNode: edge.targetNode,
          }),
        );
      });
    });
    previousEdges.forEach((edge) => {
      this.updateEdge({
        ...edge,
        target: choiceNode.id,
        targetNode: choiceNode,
      });
    });

    this.addNodes([choiceNode, ...slotNodes]);
    this.addEdges(newEdges);
  }

  addNodeBetweenEdges({
    id,
    data,
    stateDefinitionName,
    parentNode,
    target,
    nextEdges = [],
  } = {}) {
    const connectionEdges = [];
    // Create choice with given data and next edges
    if (data && nextEdges.length > 0) {
      const choiceNode = new ChoiceNode({
        id,
        parentNode,
        data,
      });
      const choices = choiceNode.data.stateDefinition.choices;
      nextEdges.forEach((edge) => {
        const choiceItem = choices.find(c => c.sourceHandle === edge.sourceHandle);
        connectionEdges.push(new Edge({
          ...edge,
          id: choiceItem.id,
          source: id,
          sourceHandle: choiceItem.sourceHandle,
        }));
      });
      this.addNodes([choiceNode]);
      this.addEdges(connectionEdges);
      return;
    }
    // Create empty choice group
    const targetNode = this.findNode(target);
    const {
      defaultSlotNodeId,
      nonDefaultSlotNodeId,
      choiceNode,
      slotNodes,
      rulesEdges,
    } = this.createChoiceGroup({
      id,
      data,
      stateDefinitionName,
      parentNode,
      targetNode,
    });
    const endNode = this.findRouteEndNode(target);
    connectionEdges.push(
      new Edge({
        id: strUtils.uuid(),
        source: nonDefaultSlotNodeId,
        target: endNode.id,
      }),
    );
    if (defaultSlotNodeId) {
      connectionEdges.push(
        new Edge({
          id: strUtils.uuid(),
          source: defaultSlotNodeId,
          target,
        }),
      );
    }
    this.addNodes([choiceNode, ...slotNodes]);
    this.addEdges([...connectionEdges, ...rulesEdges]);
  }

  /**
   * @param {Object} params
   * @param {ChoiceItem} params.choiceItem
   */
  createChoiceItem({
    choiceId,
    choiceItem,
  } = {}) {
    const choice = this.findNode(choiceId);
    if (!choice) return;
    const slotNodeId = strUtils.uuid();
    const endNode = this.findRouteEndNode(choiceId);
    this.addNodes([new SlotNode({
      id: slotNodeId,
      parentNode: choice.parentNode,
    })]);
    const newEdges = [
      new ChoiceItemEdge({
        id: choiceItem.id,
        source: choiceId,
        sourceHandle: choiceItem.sourceHandle,
        target: slotNodeId,
        label: '',
      }),
      new Edge({
        id: strUtils.uuid(),
        source: slotNodeId,
        target: endNode.id,
      })];
    this.addEdges(newEdges);
  }

  /**
   * @param {Object} params
   * @param {ChoiceItem} params.choiceItem
   */
  deleteChoiceItem({
    choiceId,
    choiceItem,
  } = {}) {
    const choice = this.findNode(choiceId);
    if (!choice) return;
    const { nextEdges, nextNodes } = this.nodeConnectionMap.get(choiceId);
    const choiceItemEdge = nextEdges.find(edge => edge.id === choiceItem.id);
    const firstNodeToRemove = nextNodes.find(node => node.id === choiceItemEdge.target);
    const retainedNextNodeIds = nextEdges.filter(edge => edge.id !== choiceItem.id).map(edge => edge.target);
    const endNode = this.findRouteEndNode(choiceId);
    this.removeEdges([choiceItem.id]);

    const findPathToEndNode = (currentNodeId, endNodeId) => {
      if (currentNodeId === endNodeId) {
        return;
      }
      const visitedNodes = new Set();
      const nodesInPath = [];
      const edgesInPath = [];
      const searchPath = (nodeId) => {
        if (nodeId === endNodeId) {
          return true;
        }
        visitedNodes.add(nodeId);
        let hasPathToEndNode = false;
        const edgesFromNode = this.edges.filter(edge => edge.source === nodeId);
        for (const edge of edgesFromNode) {
          if (!visitedNodes.has(edge.target)) {
            if (searchPath(edge.target)) {
              hasPathToEndNode = true;
              if (edge.target !== endNodeId) {
                nodesInPath.push(edge.target);
              }
              edgesInPath.push(edge.id);
            }
          }
        }
        if (hasPathToEndNode) {
          if (nodeId !== endNodeId) {
            nodesInPath.push(nodeId);
          }
          return true;
        }
        return false;
      };
      if (searchPath(currentNodeId)) {
        nodesInPath.push(currentNodeId);
      }
      return {
        nodes: nodesInPath,
        edges: edgesInPath,
      };
    };
    const { nodes: nodesInPathToEndNode, edges: edgesInPathToEndNode } = findPathToEndNode(firstNodeToRemove.id, endNode.id);
    if (nodesInPathToEndNode.includes(choiceId)) return;
    const retainedNodes = [];
    const retainedEdges = [];
    for (const id of retainedNextNodeIds) {
      const { nodes, edges } = findPathToEndNode(id, endNode.id);
      retainedNodes.push(...nodes);
      retainedEdges.push(...edges);
    }
    const nodesToRemove = nodesInPathToEndNode.filter(nodeId => !retainedNodes.includes(nodeId));
    const edgesToRemove = edgesInPathToEndNode.filter(edgeId => !retainedEdges.includes(edgeId));
    this.removeNodes(nodesToRemove);
    this.removeEdges(edgesToRemove);
  }

  /**
   * @param {Object} params
   * @param {ChoiceItem} params.choiceItem
   */
  updateChoiceItem({
    choiceId,
    choiceItem,
  } = {}) {
    const choice = this.findNode(choiceId);
    if (!choice) return;
    const index = choice.data.stateDefinition.choices.findIndex(c => c.id === choiceItem.id);
    if (index === -1) return;
    choice.data.stateDefinition.choices[index] = choiceItem;
  }
}

export default ChoiceNodeHandler;
