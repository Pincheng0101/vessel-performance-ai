import { getIncomers, getOutgoers, useKeyPress, useVueFlow } from '@vue-flow/core';
import { StateConstant, WorkflowConstant } from '~/constants';
import { Edge, NodeFactory } from '~/models/workflow';
import { ChoiceNodeHandler, NodeConnection, NodeHandlerFactory, ParallelNodeHandler } from '~/models/workflow/flow';
import { WorkflowDefinition } from '~/models/workflow/state';
import { ChoiceNodeData } from '~/models/workflow/state/choice';
import { EndNode } from '~/models/workflow/state/end';
import { MapNode } from '~/models/workflow/state/map';
import { ParallelNode } from '~/models/workflow/state/parallel';
import { SlotNode } from '~/models/workflow/state/slot';
import { layOut } from '~/workflow';

/**
 * @import { StartNode } from '~/models/workflow/state/start'
 * @import { Node, Edge } from '~/models/workflow'
 */

let instance;

const DRAG_PREVIEW_NODE_WIDTH = 200;
const DRAG_THRESHOLD = 3;
const NODE_DRAG_OFFSET_X = DRAG_PREVIEW_NODE_WIDTH / 2;
const NODE_DRAG_OFFSET_Y = 20;

export default function useWorkflow({ singleton = true } = {}) {
  if (!singleton) {
    instance = null;
  }
  if (!instance) {
    instance = createWorkflowInstance();
  }

  onBeforeRouteLeave(() => instance = null);
  onBeforeRouteUpdate(() => instance = null);

  return instance;
}

const createWorkflowInstance = () => {
  const {
    edges,
    findEdge,
    findNode,
    fitView,
    getConnectedEdges,
    nodes,
    screenToFlowCoordinate,
    setEdges,
    setNodes,
    setViewport,
    updateNode,
    updateNodeData,
  } = useVueFlow();

  const {
    isRedoDisabled,
    isUndoDisabled,
    redo: redoReversibleData,
    reset: resetReversibleData,
    undo: undoReversibleData,
    update: updateReversibleData,
  } = useDataReversible();

  const isDeletePressed = useKeyPress([
    'Delete',
    'Backspace',
  ]);

  const { disabledNodeTypes } = useFeature();

  const state = reactive({
    draggedNodeType: null,
    draggedNodeId: null,
    dragStartX: 0,
    dragStartY: 0,
    isDragging: false,
    interactiveEdge: null,
    interactiveSlotNode: null,
  });

  const unstyledNodes = computed(() => {
    return nodes.value.map((node) => {
      return objUtils.toRaw({
        ...node,
        class: '',
      });
    });
  });

  const unstyledEdges = computed(() => {
    return edges.value.map((edge) => {
      return objUtils.toRaw({
        ...edge,
        class: '',
        animated: false,
      });
    });
  });

  const inputSchema = computed(() => {
    const startNode = nodes.value.find(node => node.type === StateConstant.PseudoType.START.value && !node.parentNode);
    if (!startNode) return null;
    return startNode.data.inputSchema || null;
  });

  const outputSchema = computed(() => {
    const endNode = nodes.value.find(node => node.type === StateConstant.PseudoType.END.value && !node.parentNode);
    if (!endNode) return null;
    return endNode.data.outputSchema || null;
  });

  const stateMemoryInputSelector = computed(() => {
    const startNode = nodes.value.find(node => node.type === StateConstant.PseudoType.START.value && !node.parentNode);
    if (!startNode) return null;
    return startNode.data.stateMemoryInputSelector || null;
  });

  const useExternalMemoryInput = computed(() => {
    const startNode = nodes.value.find(node => node.type === StateConstant.PseudoType.START.value && !node.parentNode);
    if (!startNode) return false;
    return startNode.data.useExternalMemoryInput || false;
  });

  const isAllNodesCollapsed = computed(() => nodesCollapseStatus.value === WorkflowConstant.NodesCollapseStatus.ALL_COLLAPSED);

  const definition = ref(null);
  const simulatedOutputMap = ref(new Map());
  const editorMode = ref(WorkflowConstant.EditorMode.DESIGN.value);
  /**
   * @type {{ [key: string]: NodeConnection }}
   */
  const nodeConnectionMap = ref(new Map());
  const nodeDepthMap = ref(new Map());
  const edgeDepthMap = ref(new Map());
  const isInteractive = ref(false);
  const isSwappable = ref(true);
  const hoveredNodeId = ref(null);
  const selectedNode = ref(null);
  const selectedNodeForm = shallowRef(null);
  const stagingEdges = ref([...edges.value]);
  const stagingNodes = ref([...nodes.value]);
  const dragPreviewNode = ref({
    id: null,
    left: 0,
    top: 0,
    width: DRAG_PREVIEW_NODE_WIDTH,
  });
  const isNodeMouseDown = ref(false);
  const nodesCollapseStatus = ref(WorkflowConstant.NodesCollapseStatus.ALL_EXPANDED);

  const initDefinition = async () => {
    await nextTick();
    updateDefinitionFromNodes();
  };
  initDefinition();

  const addStagingEdges = (newEdges) => {
    stagingEdges.value.push(...newEdges);
  };

  const addStagingNodes = (newNodes) => {
    stagingNodes.value.push(...newNodes);
  };

  const removeStagingEdges = (edgeIds) => {
    stagingEdges.value = stagingEdges.value.filter(edge => !edgeIds.includes(edge.id));
  };

  const removeStagingNodes = (nodeIds) => {
    stagingNodes.value = stagingNodes.value.filter(node => !nodeIds.includes(node.id));
  };

  const updateStagingEdge = (updatedEdge) => {
    stagingEdges.value = stagingEdges.value.map(edge => edge.id === updatedEdge.id ? updatedEdge : edge);
  };

  const updateStagingNode = (updatedNode) => {
    stagingNodes.value = stagingNodes.value.map(node => node.id === updatedNode.id ? updatedNode : node);
  };

  watch(() => isNodeMouseDown.value, (after) => {
    document.body.style.userSelect = after ? 'none' : '';
  });

  watch(selectedNode, (after, before) => {
    if (!after) {
      selectedNodeForm.value = null;
      return;
    }
    if (after.id === before?.id) return;
    const formComponent = findField(StateConstant.Type, after.type, 'formComponent') || findField(StateConstant.ActionType, after.type, 'formComponent') || findField(StateConstant.PseudoType, after.type, 'formComponent');
    selectedNodeForm.value = (formComponent && !disabledNodeTypes.value.map(type => type.value).includes(after.type))
      ? defineAsyncComponent(() => import(`~/components/${formComponent}.vue`))
      : null;
  });

  watch(hoveredNodeId, (after, before) => {
    if (before && before !== after) {
      toggleConnectedEdgesHighlighted(before);
      return;
    }
    if (after) {
      toggleConnectedEdgesHighlighted(after);
    }
  });

  watch(isDeletePressed, (after) => {
    const isDeletable = isDeletableNode(selectedNode.value);
    if (after && selectedNode.value && isDeletable) {
      removeNode(selectedNode.value.id);
    }
  });

  watch(editorMode, (after) => {
    setSwappable(after === WorkflowConstant.EditorMode.DESIGN.value);
    if (isSwappable.value && isInteractive.value) {
      isInteractive.value = false;
    }
    if (after === WorkflowConstant.EditorMode.DESIGN.value) return;
    closeConfigForm();
  });

  // TODO: Implement partial update when sample input/output api is ready.
  watch(definition, (after) => {
    if (!after) return;
    const asl = WorkflowDefinition.toAsl(after);
    simulatedOutputMap.value = getSimulatedOutputMapFromAsl(asl);
  });

  const updateFlow = ({
    updatedNodes,
    updatedEdges,
  }) => {
    if (!updatedNodes || !updatedEdges) return;
    const nodeInstances = updatedNodes.map(node => NodeFactory.create(node));
    const edgeInstances = updatedEdges.map(edge => new Edge(edge));
    setNodes(nodeInstances);
    setEdges(edgeInstances);
    stagingNodes.value = [...nodes.value];
    stagingEdges.value = [...edges.value];
    updateNodeConnectionMap();
    updateDepth();
  };

  const updateDefinitionFromNodes = () => {
    const startNode = findWorkflowStartNode();
    const states = getStatesFromNodes();
    if (!startNode || !states.length) return;

    const newDefinition = new WorkflowDefinition({
      startAt: startNode.data.startAt,
      states,
    });
    if (jsonUtils.safeStringify(definition.value) === jsonUtils.safeStringify(newDefinition)) return;
    definition.value = newDefinition;
  };

  const updateUndoStack = () => {
    updateReversibleData({
      nodes: unstyledNodes.value,
      edges: unstyledEdges.value,
    });
  };

  const resetUndoRedoStacks = () => {
    resetReversibleData();
  };

  const undo = () => {
    const currentData = {
      nodes: unstyledNodes.value,
      edges: unstyledEdges.value,
    };
    const { nodes, edges } = undoReversibleData(currentData);
    updateFlow({
      updatedNodes: nodes,
      updatedEdges: edges,
    });
    updateWorkflowChain();
    updateDefinitionFromNodes();
    closeConfigForm();
  };

  const redo = () => {
    const currentData = {
      nodes: unstyledNodes.value,
      edges: unstyledEdges.value,
    };
    const { nodes, edges } = redoReversibleData(currentData);
    updateFlow({
      updatedNodes: nodes,
      updatedEdges: edges,
    });
    updateWorkflowChain();
    updateDefinitionFromNodes();
    closeConfigForm();
  };

  const organizeFlow = async ({
    enableUpdateUndoStack = true,
  } = {}) => {
    if (enableUpdateUndoStack) {
      updateUndoStack();
    }
    const organized = await layOut({
      nodes: stagingNodes.value,
      edges: stagingEdges.value,
      findNode,
    });
    updateFlow({
      updatedNodes: organized,
      updatedEdges: stagingEdges.value,
    });
  };

  const updateNodeConnectionMap = () => {
    nodes.value.forEach((node) => {
      const incomerNodes = getIncomers(node, nodes.value, edges.value);
      const outgoerNodes = getOutgoers(node, nodes.value, edges.value);
      const connectedEdges = getConnectedEdges(node.id, edges.value);

      const incomerEdges = connectedEdges.filter(edge => edge.target === node.id);
      const previousEdges = incomerEdges.filter(edge => edge.type === WorkflowConstant.EdgeType.CUSTOM);
      const previousNodes = incomerNodes.filter(node => previousEdges.some(edge => edge.source === node.id));
      const fallbackFromEdges = incomerEdges.filter(edge => edge.type === WorkflowConstant.EdgeType.FALLBACK);
      const fallbackFromNodes = incomerNodes.filter(node => fallbackFromEdges.some(edge => edge.source === node.id));

      const outgoerEdges = connectedEdges.filter(edge => edge.source === node.id);
      const nextEdges = outgoerEdges.filter(edge => edge.type === WorkflowConstant.EdgeType.CUSTOM);
      const nextNodes = outgoerNodes.filter(node => nextEdges.some(edge => edge.target === node.id));
      const fallbackEdges = outgoerEdges.filter(edge => edge.type === WorkflowConstant.EdgeType.FALLBACK);
      const fallbackNodes = outgoerNodes.filter(node => fallbackEdges.some(edge => edge.target === node.id));

      nodeConnectionMap.value.set(node.id, new NodeConnection({
        nodeType: node.type,
        previousEdges,
        previousNodes,
        fallbackFromEdges,
        fallbackFromNodes,
        nextEdges,
        nextNodes,
        fallbackEdges,
        fallbackNodes,
      }));
    });
  };

  const updateDepth = async () => {
    updateVueFlowElementDepthMap();
    await nextTick();
    applyDepthClassToVueFlowElements();
  };

  const updateVueFlowElementDepthMap = () => {
    const getDepth = (node) => {
      if (!node.parentNode) return 0;
      if (nodeDepthMap.value.has(node.id)) return nodeDepthMap.value.get(node.id);

      const parent = nodes.value.find(n => n.id === node.parentNode);
      const depth = parent ? getDepth(parent) + 1 : 0;
      nodeDepthMap.value.set(node.id, depth);
      return depth;
    };

    nodeDepthMap.value.clear();
    nodes.value.forEach((node) => {
      nodeDepthMap.value.set(node.id, getDepth(node));
    });

    edgeDepthMap.value.clear();
    edges.value.forEach((edge) => {
      const sourceDepth = nodeDepthMap.value.get(edge.source) ?? 0;
      const targetDepth = nodeDepthMap.value.get(edge.target) ?? 0;
      const edgeDepth = Math.max(sourceDepth, targetDepth);
      edgeDepthMap.value.set(edge.id, edgeDepth);
    });
  };

  const getEdgeParentSvg = (edgeId) => {
    const edgeElement = document.querySelector(`[data-id="${edgeId}"]`);
    if (!edgeElement) return null;
    return edgeElement.closest('svg');
  };

  const applyDepthClassToVueFlowElements = () => {
    nodes.value.forEach((n) => {
      const depth = nodeDepthMap.value.get(n.id);
      const node = findNode(n.id);
      const classes = node.class ? node.class.split(' ') : [];
      classes.push(`depth-${depth}`);
      node.class = classes.join(' ');
    });
    edges.value.forEach((e) => {
      const depth = edgeDepthMap.value.get(e.id);
      const edge = findEdge(e.id);
      const parentSvg = getEdgeParentSvg(edge.id);
      if (!parentSvg) return;
      parentSvg.classList.add(`depth-${depth}`);
    });
  };

  const isDeletableNode = (node) => {
    return node && !(Object.values(StateConstant.PseudoType).map(v => v.value).includes(node.type));
  };

  const toggleClassOnVueFlowElement = (id, className) => {
    const element = findNode(id) || findEdge(id);
    if (!element) return;

    const classes = element.class ? element.class.split(' ') : [];
    if (classes.includes(className)) {
      element.class = classes.filter(c => c !== className).join(' ');
      return;
    }
    classes.push(className);
    element.class = classes.join(' ');
  };

  const toggleMarkerEndHighlighted = (edgeId) => {
    const edge = findEdge(edgeId);
    if (!edge) return;
    const gElement = document.querySelector(`[data-id="${edgeId}"]`);
    if (!gElement) return;
    const svgElement = gElement.parentElement;
    if (!svgElement) return;
    if (svgElement !== svgElement.parentNode.lastElementChild) {
      // Move to the end of the parent to ensure its visibility
      svgElement.parentNode.appendChild(svgElement);
    }
    const pathElement = gElement.querySelector('path');
    if (!pathElement) return;
    const markerEndUrl = pathElement.getAttribute('marker-end');
    if (!markerEndUrl) return;
    const markerElement = elementUtils.getMarkerByUrl(markerEndUrl);
    if (!markerElement) return;
    markerElement.classList.toggle(WorkflowConstant.ClassName.HIGHLIGHTED);
  };

  const getEdgeSourceHandle = (edgeId) => {
    const edge = findEdge(edgeId);
    if (!edge) return;
    const handleId = edge.sourceHandle;
    const sourceNodeId = edge.source;
    if (!handleId && !sourceNodeId) return;
    return handleId
      ? document.querySelector(`[data-handleid="${handleId}"].vue-flow__handle-right`)
      : document.querySelector(`[data-nodeid="${sourceNodeId}"].vue-flow__handle-right`);
  };

  const toggleSlotNodeInteractive = (id) => {
    toggleClassOnVueFlowElement(id, WorkflowConstant.ClassName.INTERACTIVE);
  };

  const toggleEdgeInteractive = (id) => {
    const edge = findEdge(id);
    if (!edge) return;
    toggleClassOnVueFlowElement(id, WorkflowConstant.ClassName.INTERACTIVE);
    toggleMarkerEndHighlighted(id);
    const parentSvg = getEdgeParentSvg(id);
    if (!parentSvg) return;
    parentSvg.classList.toggle(WorkflowConstant.ClassName.INTERACTIVE);
    const sourceHandle = getEdgeSourceHandle(id);
    sourceHandle.classList.toggle(WorkflowConstant.ClassName.INTERACTIVE);
    edge.animated = !edge.animated;
    stagingEdges.value = stagingEdges.value.map(e => e.id === id
      ? {
          ...e,
          class: edge.class,
          animated: edge.animated,
        }
      : e,
    );
  };

  // FIXME: Need to support WorkflowRightAngleEdge
  const getEdgeCenter = (edgeId) => {
    const edge = findEdge(edgeId);
    if (!edge) return;
    const targetX = edge.targetX;
    const targetY = edge.targetY;
    const sourceX = edge.sourceX;
    const sourceY = edge.sourceY;
    return {
      x: (sourceX + targetX) / 2,
      y: (sourceY + targetY) / 2,
    };
  };

  const getAbsolutePosition = (nodeId) => {
    let node = findNode(nodeId);
    if (!node) return;
    const position = { x: node.position.x, y: node.position.y };
    while (node.parentNode) {
      node = findNode(node.parentNode);
      position.x += node.position.x;
      position.y += node.position.y;
    }
    return position;
  };

  const findInteractiveSlotNode = (position, excludedNodeIds = []) => {
    const result = nodes.value.find((node) => {
      if (excludedNodeIds.includes(node.id)) return false;
      return node.type === StateConstant.PseudoType.SLOT.value
        && position.x >= getAbsolutePosition(node.id).x - WorkflowConstant.Dimension.SLOT_NODE_INTERACTION_WIDTH / 2
        && position.x <= getAbsolutePosition(node.id).x + WorkflowConstant.Dimension.SLOT_NODE_INTERACTION_WIDTH
        && position.y >= getAbsolutePosition(node.id).y - WorkflowConstant.Dimension.SLOT_NODE_INTERACTION_HEIGHT
        && position.y <= getAbsolutePosition(node.id).y + WorkflowConstant.Dimension.SLOT_NODE_INTERACTION_HEIGHT * 2;
    },
    );
    return result;
  };

  const findInteractiveEdge = (position, excludedEdgeIds = []) => {
    const result = edges.value.find((edge) => {
      if (excludedEdgeIds.includes(edge.id)) return false;
      const center = getEdgeCenter(edge.id);
      const { x: centerX, y: centerY } = center;
      return edge.targetNode?.type !== StateConstant.PseudoType.SLOT.value
        && edge.sourceNode?.type !== StateConstant.PseudoType.SLOT.value
        && position.x >= centerX - WorkflowConstant.Dimension.EDGE_INTERACTION
        && position.x <= centerX + WorkflowConstant.Dimension.EDGE_INTERACTION
        && position.y >= centerY - WorkflowConstant.Dimension.EDGE_INTERACTION
        && position.y <= centerY + WorkflowConstant.Dimension.EDGE_INTERACTION;
    });
    return result;
  };

  const getInitialStateDefinitionName = (type) => {
    const usedNames = nodes.value.map(node => node.data.stateDefinition?.name);
    const nodesOfType = nodes.value.filter(node => node.type === type);
    let index = nodesOfType.length;
    const defaultName = findField(StateConstant.Type, type, 'stateDefinitionName') || findField(StateConstant.ActionType, type, 'stateDefinitionName');
    let result = defaultName;
    while (usedNames.includes(result)) {
      result = `${defaultName}_${index++}`;
    }
    return result;
  };

  const createChoiceHandler = () => {
    return new ChoiceNodeHandler({
      addEdges: addStagingEdges,
      addNodes: addStagingNodes,
      edges: stagingEdges.value,
      findNode,
      findRouteEndNode,
      nodeConnectionMap: nodeConnectionMap.value,
      nodes: stagingNodes.value,
      removeEdges: removeStagingEdges,
      removeNodes: removeStagingNodes,
    });
  };

  const createParallelHandler = () => {
    return new ParallelNodeHandler({
      addEdges: addStagingEdges,
      addNodes: addStagingNodes,
      edges: stagingEdges.value,
      nodes: stagingNodes.value,
      removeEdges: removeStagingEdges,
      removeNodes: removeStagingNodes,
    });
  };

  const updateWorkflowChain = () => {
    updateNodeConnectionMap();
    updateDepth();
    const innerToOuterNodes = [...nodes.value].sort((a, b) => nodeDepthMap.value.get(b.id) - nodeDepthMap.value.get(a.id));
    innerToOuterNodes.forEach((node) => {
      const isStartNode = node.type === StateConstant.PseudoType.START.value;
      const isEndNode = node.type === StateConstant.PseudoType.END.value;
      const isSlotNode = node.type === StateConstant.PseudoType.SLOT.value;
      const { previousNodes, nextNodes, previousEdges, fallbackFromEdges, fallbackFromNodes } = nodeConnectionMap.value.get(node.id);
      if (nextNodes.length === 0 && !isEndNode && !isSlotNode) {
        if (isStartNode) {
          node.data.startAt = undefined;
          return;
        }
        node.data.stateDefinition.end = undefined;
        node.data.stateDefinition.next = undefined;
      }
      // Update startAt, next and end
      for (const previousNode of previousNodes) {
        if (previousNode.type === StateConstant.PseudoType.END.value
          || previousNode.type === StateConstant.PseudoType.SLOT.value) {
          continue;
        }
        if (previousNode.type === StateConstant.PseudoType.START.value) {
          previousNode.data.startAt = node.data.stateDefinition?.name;
          continue;
        }
        if (previousNode.type !== StateConstant.Type.CHOICE.value) {
          previousNode.data.stateDefinition.next = node.data.stateDefinition?.name;
          previousNode.data.stateDefinition.end = isEndNode ? true : undefined;
          continue;
        }
        const choiceNode = previousNode;
        const choiceItemEdge = previousEdges.find(edge => edge.source === choiceNode.id);
        const choiceItem = previousNode.data.stateDefinition.choices.find(choiceItem => choiceItem.id === choiceItemEdge.id);
        if (!choiceItem) continue;
        if (choiceItem.isDefault) {
          previousNode.data.stateDefinition.defaultChoice = node.data.stateDefinition?.name;
        }
        const choiceHandler = createChoiceHandler();
        choiceHandler.updateChoiceItem({
          choiceId: previousNode.id,
          choiceItem: {
            ...choiceItem,
            stateDefinition: {
              ...choiceItem.stateDefinition,
              next: node.data.stateDefinition?.name,
              end: (isEndNode || isSlotNode) ? true : undefined,
            },
          },
        });
      };
      // Update next in catch
      for (const fallbackFromEdge of fallbackFromEdges) {
        const catchItemId = fallbackFromEdge.id;
        const fallbackFromNode = fallbackFromNodes.find(node => node.id === fallbackFromEdge.source);
        const catches = fallbackFromNode.data.stateDefinition.errorHandling.catches;
        const catchItem = catches.find(c => c.id === catchItemId);
        catchItem.next = node.data.stateDefinition?.name;
      };
    });
    innerToOuterNodes.forEach((node) => {
      if (node.type === StateConstant.Type.MAP.value) {
        const mapNode = new MapNode(node);
        const states = nodes.value.filter(node =>
          node.parentNode === mapNode.id
          && !(Object.values(StateConstant.PseudoType).map(v => v.value).includes(node.type)))
          .map(node => node.data.stateDefinition);
        mapNode.data.stateDefinition.itemProcessor.states = states;
        const startNode = nodes.value.find(node => node.parentNode === mapNode.id && node.type === StateConstant.PseudoType.START.value);
        const startAt = startNode?.data?.startAt;
        mapNode.data.stateDefinition.itemProcessor.startAt = startAt;
        updateNode(node.id, mapNode);
      }
      if (node.type === StateConstant.Type.PARALLEL.value) {
        const parallelNode = new ParallelNode(node);
        const startNode = nodes.value.find(node => node.parentNode === parallelNode.id && node.type === StateConstant.PseudoType.START.value);
        const branches = startNode ? getParallelBranches(startNode) : [];
        parallelNode.data.stateDefinition.branches = branches;
        updateNode(node.id, parallelNode);
      }
    });
  };

  const getParallelBranches = (startNode) => {
    const branches = [];
    const visitCountMap = new Map();
    const previousEdgesCountMap = new Map();

    const findStartAtNodes = () => {
      const result = [];
      const { nextEdges } = nodeConnectionMap.value.get(startNode.id);
      for (const edge of nextEdges) {
        const targetNode = findNode(edge.target);
        if (targetNode.type !== StateConstant.PseudoType.END.value
          && targetNode.type !== StateConstant.PseudoType.SLOT.value
        ) {
          result.push(targetNode);
        }
      }
      return result;
    };

    edges.value.forEach((edge) => {
      previousEdgesCountMap.set(edge.target, (previousEdgesCountMap.get(edge.target) || 0) + 1);
    });

    const traverseBranch = (nodeId, currentBranch, startAtNodeId) => {
      const node = findNode(nodeId);
      const visitedCount = visitCountMap.get(nodeId) || 0;
      const previousEdgesCount = previousEdgesCountMap.get(nodeId);
      if (visitedCount >= previousEdgesCount && node.type !== StateConstant.PseudoType.END.value) return;

      visitCountMap.set(nodeId, visitedCount + 1);
      if (node.type !== StateConstant.PseudoType.END.value && node.type !== StateConstant.PseudoType.SLOT.value) {
        currentBranch.add(node.data.stateDefinition);
      }

      const { nextNodes, nextEdges } = nodeConnectionMap.value.get(nodeId);
      const nextNodeIds = nextNodes.map(node => node.id);
      const areAllNextNodesTraversalComplete = nextNodeIds.every(id => visitCountMap.get(id) >= previousEdgesCountMap.get(id));
      if (nextEdges.length === 0 || areAllNextNodesTraversalComplete) {
        const startAt = findNode(startAtNodeId).data.stateDefinition.name;
        const existingBranch = branches.find(branch => branch.startAt === startAt);
        if (existingBranch) {
          existingBranch.states = Array.from(currentBranch);
          return;
        }
        branches.push({
          startAt,
          states: Array.from(currentBranch),
        });
        return;
      }
      nextEdges.forEach(edge => traverseBranch(edge.target, currentBranch, startAtNodeId));
    };

    const startAtNodes = findStartAtNodes();
    startAtNodes.forEach((node) => {
      if (!visitCountMap.get(node.id)) {
        traverseBranch(node.id, new Set(), node.id);
      }
    });

    return branches;
  };

  const replaceSlotNode = (newNodeId, nodeType, node) => {
    const slotNode = state.interactiveSlotNode;
    const { previousEdges, nextEdges } = nodeConnectionMap.value.get(slotNode.id);
    const fallbackEdges = [];
    if (node) {
      const connection = nodeConnectionMap.value.get(node.id);
      const { fallbackEdges: fallbackEdgesFromNodeConnection } = connection;
      fallbackEdges.push(...fallbackEdgesFromNodeConnection);
    }
    NodeHandlerFactory.create({
      type: nodeType,
      addEdges: addStagingEdges,
      addNodes: addStagingNodes,
      updateEdge: updateStagingEdge,
      edges: stagingEdges.value,
    }).replaceSlotNode({
      id: newNodeId,
      data: node?.data,
      stateDefinitionName: node?.data?.stateDefinitionName || getInitialStateDefinitionName(nodeType),
      parentNode: slotNode.parentNode,
      previousEdges,
      nextEdges,
      fallbackEdges,
    });
  };

  const addNodeBetweenEdges = (newNodeId, nodeType, node) => {
    let targetNodeId = state.interactiveEdge?.target;
    const nextEdges = [];
    const fallbackEdges = [];

    if (node) {
      const connection = nodeConnectionMap.value.get(node.id);
      const { nextNodes, nextEdges: nextEdgesFromNodeConnection, fallbackEdges: fallbackEdgesFromNodeConnection } = connection;
      targetNodeId = targetNodeId || nextNodes[0]?.id;
      nextEdges.push(...nextEdgesFromNodeConnection);
      fallbackEdges.push(...fallbackEdgesFromNodeConnection);
    }
    const targetNode = findNode(targetNodeId);
    const nodeHandler = nodeType === StateConstant.Type.CHOICE.value
      ? createChoiceHandler()
      : NodeHandlerFactory.create({
          type: nodeType,
          addEdges: addStagingEdges,
          addNodes: addStagingNodes,
          edges: stagingEdges.value,
        });
    nodeHandler.addNodeBetweenEdges({
      id: newNodeId,
      data: node?.data,
      stateDefinitionName: node?.data?.stateDefinition?.name || getInitialStateDefinitionName(nodeType),
      parentNode: targetNode.parentNode,
      target: targetNodeId,
      nextEdges,
      fallbackEdges,
    });
    const edgeToReconnect = state.interactiveEdge || stagingEdges.value.find(edge => edge.target === targetNodeId && edge.source === node.id);
    stagingEdges.value = stagingEdges.value.map(edge =>
      edge.id === edgeToReconnect.id
        ? {
            ...edge,
            target: newNodeId,
          }
        : edge);
  };

  const addNodesOnDrop = async (nodeType, node, dropType = WorkflowConstant.DropType.ADD) => {
    const newNodeId = strUtils.uuid();
    if (!state.interactiveSlotNode && !state.interactiveEdge) return;
    if (state.interactiveSlotNode) {
      replaceSlotNode(newNodeId, nodeType, node);
      removeStagingNodes([state.interactiveSlotNode.id]);
      state.interactiveSlotNode = null;
    } else if (state.interactiveEdge) {
      addNodeBetweenEdges(newNodeId, nodeType, node);
      toggleEdgeInteractive(state.interactiveEdge.id);
      state.interactiveEdge = null;
    }
    if (node && dropType === WorkflowConstant.DropType.MOVE) {
      removeNode(node.id);
    }
    await organizeFlow();
    updateWorkflowChain();
    updateDefinitionFromNodes();
    closeConfigForm();

    const addedNode = findNode(newNodeId);
    setSelectedNode(addedNode);
  };

  const addSlotNode = (sourceNodeId, targetNodeId) => {
    const sourceNode = findNode(sourceNodeId);
    const slotNode = new SlotNode({
      id: strUtils.uuid(),
      parentNode: sourceNode.parentNode,
    });
    const newEdges = [
      new Edge({
        id: strUtils.uuid(),
        source: sourceNodeId,
        target: slotNode.id,
      }),
      new Edge({
        id: strUtils.uuid(),
        source: slotNode.id,
        target: targetNodeId,
      }),
    ];
    addStagingNodes([slotNode]);
    addStagingEdges(newEdges);
  };

  const connectPreviousAndNextNodes = (removedNodeId, nextNodeId = null) => {
    const nodeConnection = nodeConnectionMap.value.get(removedNodeId);
    if (!nodeConnection || nodeConnection.nodeType === StateConstant.PseudoType.SLOT.value) return;
    const { previousNodes, nextNodes, previousEdges } = nodeConnection;
    const targetNode = nextNodeId ? findNode(nextNodeId) : nextNodes[0];
    for (const previousNode of previousNodes) {
      if (previousNode.id === removedNodeId) continue;
      // If source node is a start node and target node is a end node
      if (previousNode.type === StateConstant.PseudoType.START.value && targetNode?.type === StateConstant.PseudoType.END.value) {
        addSlotNode(previousNode.id, targetNode.id);
        continue;
      }
      // If source node is a start node and target node is the removed node
      if (previousNode.type === StateConstant.PseudoType.START.value && targetNode.id === removedNodeId) {
        const endNode = nodes.value.find(n => n.type === StateConstant.PseudoType.END.value && n.parentNode === previousNode.parentNode);
        addSlotNode(previousNode.id, endNode.id);
        continue;
      }
      // If target node is the removed node, create a self-loop edge for previous node
      if (targetNode.id === removedNodeId) {
        const newEdge = new Edge({
          id: strUtils.uuid(),
          source: previousNode.id,
          target: previousNode.id,
        });
        addStagingEdges([newEdge]);
        continue;
      }
      // Special case if source node is a choice node
      if (previousNode.type === StateConstant.Type.CHOICE.value) {
        const choiceItemEdge = previousEdges.find(edge => edge.source === previousNode.id);
        const choiceItem = previousNode.data.stateDefinition.choices.find(choiceItem => choiceItem.id === choiceItemEdge.id);
        const newEdge = new Edge({
          id: choiceItem.id,
          source: previousNode.id,
          sourceHandle: choiceItem.sourceHandle,
          target: targetNode.id,
        });
        addStagingEdges([newEdge]);
        if (choiceItem.isDefault) {
          previousNode.data.stateDefinition.defaultChoice = targetNode.type === StateConstant.PseudoType.END.value
            ? null
            : targetNode.data.stateDefinition.name;
          continue;
        }
        const choiceHandler = createChoiceHandler();
        choiceHandler.updateChoiceItem({
          choiceId: previousNode.id,
          choiceItem: {
            ...choiceItem,
            stateDefinition: {
              ...choiceItem.stateDefinition,
              next: targetNode.type === StateConstant.PseudoType.END.value ? undefined : targetNode.data.stateDefinition.name,
              end: targetNode.type === StateConstant.PseudoType.END.value || undefined,
            },
          },
        });
        continue;
      }
      const newEdge = new Edge({
        id: strUtils.uuid(),
        source: previousNode.id,
        target: targetNode.id,
      });
      addStagingEdges([newEdge]);
    }
  };

  const connectFallbackFromAndNextNodes = (removedNodeId, nextNodeId = null) => {
    const nodeConnection = nodeConnectionMap.value.get(removedNodeId);
    if (!nodeConnection || nodeConnection.nodeType === StateConstant.PseudoType.SLOT.value) return;
    const { nextNodes, fallbackFromEdges } = nodeConnection;
    const targetNode = nextNodeId ? findNode(nextNodeId[0]) : nextNodes[0];
    for (const fallbackFromEdge of fallbackFromEdges) {
      const fallbackFromNode = findNode(fallbackFromEdge.source);
      if (fallbackFromNode.id === removedNodeId) continue;
      const catchItem = fallbackFromNode.data.stateDefinition.errorHandling.catches.find(c => c.id === fallbackFromEdge.id);
      if (!catchItem) continue;
      const newEdge = new Edge({
        id: catchItem.id,
        type: WorkflowConstant.EdgeType.FALLBACK,
        source: fallbackFromEdge.source,
        sourceHandle: catchItem.id,
        target: targetNode.id,
      });
      addStagingEdges([newEdge]);
    }
  };

  const reconnectToNextNode = ({
    edgeId,
    nodeId,
    nextNodeId,
    sourceHandle,
  }) => {
    const parentNode = findNode(nodeId).parentNode;
    const edgeToRemove = edges.value.find(edge => edge.source === nodeId && edge.sourceHandle === sourceHandle);
    if (edgeToRemove) {
      removeStagingEdges([edgeToRemove.id]);
      if (parentNode) {
        const endNodesInSameParent = nodes.value.filter(node => node.type === StateConstant.PseudoType.END.value && node.parentNode === parentNode);
        const nodesToRemove = endNodesInSameParent.filter(node => getConnectedEdges(node.id).map(edge => edge.id).every(id => id === edgeToRemove.id));
        if (nodesToRemove.length) {
          removeStagingNodes(nodesToRemove.map(node => node.id));
        }
      }
    }
    const edgeTarget = nextNodeId || strUtils.uuid();
    if (!nextNodeId) {
      addStagingNodes([
        new EndNode({
          id: edgeTarget,
          parentNode,
        }),
      ]);
    }
    addStagingEdges([
      new Edge({
        id: edgeId || strUtils.uuid(),
        source: nodeId,
        sourceHandle,
        target: edgeTarget,
      }),
    ]);
  };

  const reconnectToFallbackNode = ({
    nodeId,
    added,
    removed,
    changed,
  }) => {
    if (added.length === 0 && removed.length === 0 && changed.length === 0) return;
    if (added.length > 0) {
      added.forEach((catchItem) => {
        const nextNodeId = nodes.value.find(node => node.data.stateDefinition?.name === catchItem.next)?.id;
        addStagingEdges([
          new Edge({
            id: catchItem.id,
            type: WorkflowConstant.EdgeType.FALLBACK,
            source: nodeId,
            sourceHandle: catchItem.id,
            target: nextNodeId,
          }),
        ]);
      });
    }
    if (removed.length > 0) {
      removed.forEach((catchItem) => {
        const edgeToRemove = edges.value.find(edge => edge.id === catchItem.id);
        if (edgeToRemove) {
          removeStagingEdges([edgeToRemove.id]);
        }
      });
    }
    if (changed.length > 0) {
      changed.forEach((catchItem) => {
        const edgeToRemove = edges.value.find(edge => edge.id === catchItem.id);
        if (edgeToRemove) {
          removeStagingEdges([edgeToRemove.id]);
        }
        const nextNodeId = nodes.value.find(node => node.data.stateDefinition?.name === catchItem.next)?.id;
        addStagingEdges([
          new Edge({
            id: catchItem.id,
            type: WorkflowConstant.EdgeType.FALLBACK,
            source: nodeId,
            sourceHandle: catchItem.id,
            target: nextNodeId,
          }),
        ]);
      });
    }
  };

  const closeConfigForm = () => {
    // Use highlighted class to avoid conflict with vue-flow's selected class
    toggleClassOnVueFlowElement(selectedNode.value?.id, WorkflowConstant.ClassName.HIGHLIGHTED);
    selectedNode.value = null;
  };

  const setSelectedNode = (node) => {
    // Use highlighted class to avoid conflict with vue-flow's selected class
    selectedNode.value = NodeFactory.create(node);
    toggleClassOnVueFlowElement(selectedNode.value.id, WorkflowConstant.ClassName.HIGHLIGHTED);
  };

  /**
   * @returns {StartNode}
   */
  const findWorkflowStartNode = () => {
    return nodes.value.find(node => node.type === StateConstant.PseudoType.START.value && !node.parentNode);
  };

  /**
   * @returns {EndNode}
   */
  const findWorkflowEndNode = () => {
    return nodes.value.find(node => node.type === StateConstant.PseudoType.END.value && !node.parentNode);
  };

  /**
   * @returns {EndNode}
   */
  const findRouteEndNode = (fromNodeId) => {
    const fromNode = findNode(fromNodeId);
    if (fromNode.type === StateConstant.PseudoType.END.value) return fromNode;
    const visited = new Set();
    const traverseForEndNode = (nodes) => {
      for (const node of nodes) {
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        if (node.type === StateConstant.PseudoType.END.value) {
          return node;
        }
        const connection = nodeConnectionMap.value.get(node.id);
        if (connection?.nextNodes?.length) {
          const result = traverseForEndNode(connection.nextNodes);
          if (result) return result;
        }
      }
      return null;
    };
    const { nextNodes } = nodeConnectionMap.value.get(fromNodeId) || {};
    return nextNodes ? traverseForEndNode(nextNodes) : null;
  };

  /**
   * @returns {Node[]}
   */
  const findDescendantNodes = (nodeId) => {
    const childNodes = nodes.value.filter(node => node.parentNode === nodeId);
    return childNodes.flatMap(childNode => [childNode, ...findDescendantNodes(childNode.id)]);
  };

  /**
   * @returns {Edge[]}
   */
  const findDescendantEdges = (nodeId) => {
    const descendantNodes = findDescendantNodes(nodeId);
    return edges.value.filter(edge => descendantNodes.some(node => node.id === edge.source || node.id === edge.target));
  };

  const getStatesFromNodes = () => {
    const validNodes = nodes.value.filter(node =>
      !(Object.values(StateConstant.PseudoType).map(v => v.value).includes(node.type))
      && !node.parentNode);
    if (validNodes.length === 0) return [];
    return validNodes.map(node => node.data.stateDefinition);
  };

  /**
   * @param {ReturnType<typeof WorkflowDefinition.toAsl>}
   */
  const getSimulatedOutputMapFromAsl = (asl) => {
    const simulatedOutputMap = new Map();

    const processResultSelector = (resultSelector) => {
      const result = {};
      for (const [key] of Object.entries(resultSelector)) {
        const outputKey = key.replace(/\.\$$/, '');
        result[outputKey] = '';
      }
      return result;
    };

    const buildStateOutput = (stateDefinition) => {
      const type = stateDefinition.Type;
      const resultPath = stateDefinition.ResultPath || '$';

      if (type === StateConstant.Type.PASS.value && stateDefinition.Parameters) {
        const partial = processResultSelector(stateDefinition.Parameters);
        return objUtils.setValueByJsonPath({}, resultPath, partial);
      }

      if (type === StateConstant.Type.TASK.value && stateDefinition.ResultSelector) {
        const partial = processResultSelector(stateDefinition.ResultSelector);
        return objUtils.setValueByJsonPath({}, resultPath, partial);
      }

      if (type === StateConstant.Type.MAP.value && stateDefinition.ItemProcessor) {
        const innerStates = stateDefinition.ItemProcessor.States || {};
        const startAt = stateDefinition.ItemProcessor.StartAt;
        const innerSim = getSimulatedOutputMapFromAsl({ States: innerStates, StartAt: startAt });
        const innerOutput = innerSim.values().next().value ?? {};
        return objUtils.setValueByJsonPath({}, resultPath, [innerOutput]);
      }

      if (type === StateConstant.Type.PARALLEL.value && stateDefinition.Branches) {
        const branchOutputs = stateDefinition.Branches.map((branch) => {
          const branchMap = getSimulatedOutputMapFromAsl({
            States: branch.States,
            StartAt: branch.StartAt,
          });
          return branchMap.get(branch.StartAt) ?? {};
        });
        return objUtils.setValueByJsonPath({}, resultPath, branchOutputs);
      }

      return objUtils.setValueByJsonPath({}, resultPath, {});
    };

    const visited = new Set();

    const processStateRecursively = (states, stateName) => {
      if (!stateName || visited.has(stateName)) return;
      visited.add(stateName);

      const state = states[stateName];
      if (!state) return;

      simulatedOutputMap.set(stateName, buildStateOutput(state));

      if (state.Type === StateConstant.Type.CHOICE.value) {
        for (const choice of state.Choices || []) {
          processStateRecursively(states, choice.Next);
        }
        if (state.Default) {
          processStateRecursively(states, state.Default);
        }
      }

      if (state.Next) {
        processStateRecursively(states, state.Next);
      }
    };

    const states = asl.States ?? {};
    const startAt = asl.StartAt;

    if (Object.keys(states).length > 0 && startAt) {
      processStateRecursively(states, startAt);
    } else if (asl.Type) {
      simulatedOutputMap.set('simulated', buildStateOutput(asl));
    }

    return simulatedOutputMap;
  };

  const updateSimulatedOutputMap = ({
    stateName,
    actionOutput,
    sampleInput,
  }) => {
    if (!definition.value) return;

    if (sampleInput) {
      simulatedOutputMap.value.set('input', sampleInput);
      return;
    }

    const asl = WorkflowDefinition.toAsl(definition.value);
    const states = asl.States;
    const state = states[stateName];

    if (!state || state.Type !== StateConstant.Type.TASK.value || !state.ResultSelector) {
      return;
    }

    const resultPath = state.ResultPath ?? '$';
    const resultSelector = state.ResultSelector;

    const resultObject = {};
    for (const [outputKeyRaw, path] of Object.entries(resultSelector)) {
      const outputKey = outputKeyRaw.replace(/\.\$$/, '');
      const extracted = jsonPathUtils.query({ Payload: actionOutput }, path);
      resultObject[outputKey] = extracted?.[0] ?? '';
    }

    const currentStateOutput = simulatedOutputMap.value.get(stateName) ?? {};
    const updated = objUtils.setValueByJsonPath(currentStateOutput, resultPath, resultObject);

    simulatedOutputMap.value.set(stateName, updated);
  };

  const handleInit = ({
    initialNodes,
    initialEdges,
  }) => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    stagingNodes.value = initialNodes;
    stagingEdges.value = initialEdges;
    updateNodeConnectionMap();
    updateDepth();
  };

  const handleNodesInitialized = async ({
    enableFitView = true,
    enableOrganizeFlow = true,
    enableSetViewport = true,
  }) => {
    updateDefinitionFromNodes();
    if (enableOrganizeFlow) {
      await organizeFlow({
        enableUpdateUndoStack: false,
      });
    }
    if (enableFitView) {
      nextTick(() => {
        fitView({
          maxZoom: 1,
        });
      });
    }
    if (enableSetViewport) {
      setViewport({
        x: 0,
        y: 140,
        zoom: 1,
      });
    }
  };

  const removeNode = async (id) => {
    const node = findNode(id);
    if (!node) return;
    hoveredNodeId.value = null;
    const nodeType = node.type;
    const removeNodeAndEdges = (nodesToRemove) => {
      const edgeIdsToRemove = getConnectedEdges(nodesToRemove).map(edge => edge.id);
      removeStagingEdges(edgeIdsToRemove);
      removeStagingNodes(nodesToRemove.map(node => node.id));
    };

    const removeChildNodes = (parentId) => {
      const childNodes = nodes.value.filter(node => parentId === node.parentNode);
      if (childNodes.length === 0) return;

      removeNodeAndEdges(childNodes);
      childNodes.forEach(childNode => removeChildNodes(childNode.id));
    };

    removeChildNodes(id);
    removeNodeAndEdges([node]);

    // Special case for removing choice node
    if (nodeType === StateConstant.Type.CHOICE.value) {
      const nodeConnection = nodeConnectionMap.value.get(id);
      const choiceNodeData = new ChoiceNodeData(node.data);
      const { previousNodes, nextNodes, fallbackFromNodes } = nodeConnection;
      for (const nextNode of nextNodes) {
        // Remove all slots
        if (nextNode.type === StateConstant.PseudoType.SLOT.value) {
          const slotNodeConnection = nodeConnectionMap.value.get(nextNode.id);
          const { nextEdges } = slotNodeConnection;
          const slotNodeEdge = nextEdges[0];
          removeStagingEdges([slotNodeEdge.id]);
          removeStagingNodes([nextNode.id]);
        }
      }
      const defaultChoice = choiceNodeData.stateDefinition.defaultChoice;
      // Check if default choice defined
      if (defaultChoice) {
        // Find the next node for the default choice and connect
        const defaultChoiceNextNode = nodes.value.find(node => node.data.stateDefinition?.name === defaultChoice);
        connectPreviousAndNextNodes(id, defaultChoiceNextNode.id);
        connectFallbackFromAndNextNodes(id, defaultChoiceNextNode.id);
      } else {
        const endNode = nodes.value.find(n => n.type === StateConstant.PseudoType.END.value && n.parentNode === node.parentNode);
        const sourceNodes = [...previousNodes, ...fallbackFromNodes];
        for (const sourceNode of sourceNodes) {
          if (sourceNode.type === StateConstant.PseudoType.START.value) {
            // Add a slot node if all choices do not lead to any next state
            if (choiceNodeData.stateDefinition.choices.every(choice => !choice.stateDefinition.next)) {
              addSlotNode(sourceNode.id, endNode.id);
            }
            continue;
          }
          // If the previous is not a start node, connect it directly to the end node
          connectPreviousAndNextNodes(id, endNode.id);
          connectFallbackFromAndNextNodes(id, endNode.id);
        }
      }
    } else {
      connectPreviousAndNextNodes(id);
      connectFallbackFromAndNextNodes(id);
    }

    await organizeFlow();
    updateWorkflowChain();
    updateDefinitionFromNodes();

    if (selectedNode.value?.id === id) {
      selectedNode.value = null;
    }
  };

  const getDuplicatedStateDefinitionName = (originalName, extraUsedNames = new Set()) => {
    const globalUsedNames = new Set(
      nodes.value.map(node => node?.data?.stateDefinition?.name).filter(Boolean),
    );
    const allUsedNames = new Set([...globalUsedNames, ...extraUsedNames]);

    let index = 1;
    let result = originalName;
    while (allUsedNames.has(result)) {
      result = `${originalName}_${index++}`;
    }
    if (extraUsedNames instanceof Set) {
      extraUsedNames.add(result);
    }
    return result;
  };

  const getDuplicatedNode = (node) => {
    const duplicatedNode = objUtils.toRaw(node);

    const usedNames = new Set();
    const nameMap = new Map();

    const originalName = duplicatedNode.data?.stateDefinition?.name;
    if (!originalName) return;
    const newName = getDuplicatedStateDefinitionName(originalName, usedNames);
    nameMap.set(originalName, newName);
    duplicatedNode.data.stateDefinition.name = newName;

    const updateStateDefinitionName = (definition) => {
      if (!definition || typeof definition !== 'object') return;

      if (Array.isArray(definition.states)) {
        for (const state of definition.states) {
          if (!state || typeof state !== 'object') continue;
          const originalName = state.name;
          const newName = getDuplicatedStateDefinitionName(originalName, usedNames);
          nameMap.set(originalName, newName);
          state.name = newName;
        }

        if (definition.startAt && nameMap.has(definition.startAt)) {
          definition.startAt = nameMap.get(definition.startAt);
        }

        for (const state of definition.states) {
          if (state.next && nameMap.has(state.next)) {
            state.next = nameMap.get(state.next);
          }
          if (Array.isArray(state.branches) || state.itemProcessor?.states || Array.isArray(state.choices)) {
            updateStateDefinitionName(state);
          }
        }
      }

      // Rename next in choice and assign a new id to create unique rule edge
      if (Array.isArray(definition.choices)) {
        for (const choiceItem of definition.choices) {
          choiceItem.id = strUtils.uuid();
          if (choiceItem.stateDefinition.next && nameMap.has(choiceItem.stateDefinition.next)) {
            choiceItem.stateDefinition.next = nameMap.get(choiceItem.stateDefinition.next);
          }
        }
      }
      if (definition.defaultChoice && nameMap.has(definition.defaultChoice)) {
        definition.defaultChoice = nameMap.get(definition.defaultChoice);
      }

      // Rename states in parallel branches
      if (Array.isArray(definition.branches)) {
        definition.branches.forEach(branch => updateStateDefinitionName(branch));
      }

      // Rename states in map itemProcessor
      if (definition.itemProcessor?.states) {
        updateStateDefinitionName(definition.itemProcessor);
      }
    };

    updateStateDefinitionName(duplicatedNode.data.stateDefinition);
    return duplicatedNode;
  };

  const duplicateNode = async (nodeId) => {
    const node = findNode(nodeId);
    if (!node) return;
    if (node.type === StateConstant.PseudoType.START.value || node.type === StateConstant.PseudoType.END.value) return;
    const newNodeId = strUtils.uuid();
    const duplicatedNode = getDuplicatedNode(node);
    // Rename resultPath based on new state definition name
    const { resultPath } = duplicatedNode.data.stateDefinition.inputOutput;
    if (resultPath) {
      const stateDefinitionName = duplicatedNode.data.stateDefinition.name;
      duplicatedNode.data.stateDefinition.inputOutput.resultPath = `${StateConstant.DefaultResultPathPrefix}${stateDefinitionName}${StateConstant.DefaultResultPathSuffix}`;
    }
    addNodeBetweenEdges(newNodeId, node.type, duplicatedNode);

    await organizeFlow();
    updateWorkflowChain();
    updateDefinitionFromNodes();
    closeConfigForm();

    const addedNode = findNode(newNodeId);
    setSelectedNode(addedNode);
  };

  const handleDragStart = (e, type) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/vueflow', type);
      e.dataTransfer.effectAllowed = 'move';
    }
    state.draggedNodeType = type;
    isNodeMouseDown.value = true;
    document.addEventListener('drop', handleDragEnd);
  };

  const handlePaneDragOver = (e) => {
    e.preventDefault();
    if (state.draggedNodeType && e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    toggleSlotNodeInteractive(state.interactiveSlotNode?.id);
    state.interactiveSlotNode = null;
    toggleEdgeInteractive(state.interactiveEdge?.id);
    state.interactiveEdge = null;

    const isDraggable = findField(StateConstant.Type, state.draggedNodeType, 'draggable') || findField(StateConstant.ActionType, state.draggedNodeType, 'draggable');
    if (state.draggedNodeId && !isDraggable) return;

    const position = screenToFlowCoordinate({
      x: e.clientX,
      y: e.clientY,
    });

    const excludedInteractiveNodeIds = [];
    const excludedInteractiveEdgeIds = [];
    if (state.draggedNodeId) {
      const descendantNodes = findDescendantNodes(state.draggedNodeId);
      excludedInteractiveNodeIds.push(...descendantNodes.map(node => node.id));
      const connectedEdges = getConnectedEdges(state.draggedNodeId);
      const descendantEdges = findDescendantEdges(state.draggedNodeId);
      excludedInteractiveEdgeIds.push(...connectedEdges.map(edge => edge.id), ...descendantEdges.map(edge => edge.id));
    }
    const interactiveSlotNode = findInteractiveSlotNode(position, excludedInteractiveNodeIds);
    const interactiveEdge = findInteractiveEdge(position, excludedInteractiveEdgeIds);

    if (interactiveSlotNode) {
      state.interactiveSlotNode = interactiveSlotNode;
      toggleSlotNodeInteractive(interactiveSlotNode.id);
      return;
    }
    if (interactiveEdge) {
      state.interactiveEdge = interactiveEdge;
      toggleEdgeInteractive(interactiveEdge.id);
    }
  };

  const handleDragEnd = () => {
    isNodeMouseDown.value = false;
    state.draggedNodeType = null;
    document.removeEventListener('drop', handleDragEnd);
  };

  const handlePaneDrop = (_event, dropType = WorkflowConstant.DropType.ADD) => {
    const nodeType = state.draggedNodeType;
    switch (dropType) {
      case WorkflowConstant.DropType.ADD: {
        addNodesOnDrop(nodeType, null, dropType);
        break;
      }
      case WorkflowConstant.DropType.MOVE: {
        const node = findNode(state.draggedNodeId);
        const isDraggable = findField(StateConstant.Type, nodeType, 'draggable') || findField(StateConstant.ActionType, nodeType, 'draggable');
        if (node && isDraggable) {
          addNodesOnDrop(nodeType, node, dropType);
        }
        break;
      }
    }
    state.draggedNodeId = null;
    dragPreviewNode.value.id = null;
  };

  const handleNodeClick = async (e) => {
    // Ensure previous selectedNode is updated
    await nextTick();
    const eventNode = e.node;
    if (selectedNode.value?.id && selectedNode.value.id === eventNode.id) return;

    toggleClassOnVueFlowElement(selectedNode.value?.id, WorkflowConstant.ClassName.HIGHLIGHTED);
    setSelectedNode(eventNode);
  };

  const handleNodeMouseDown = (e, nodeId, nodeType) => {
    if (isInteractive.value || !isSwappable.value) return;
    if (Object.values(StateConstant.PseudoType).map(v => v.value).includes(nodeType)) return;

    // prevent event bubbling from interfering with VueFlow
    e.stopPropagation();
    e.preventDefault();
    // only allow left mouse button
    if (e.button !== 0) return;

    isNodeMouseDown.value = true;
    state.isDragging = false;

    state.draggedNodeId = nodeId;
    state.draggedNodeType = nodeType;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;

    document.addEventListener('mousemove', handleNodeMouseMove);
    document.addEventListener('mouseup', handleNodeMouseUp);
  };

  const handleNodeMouseMove = (e) => {
    if (!isNodeMouseDown.value) return;

    hoveredNodeId.value = null;

    const dx = e.clientX - state.dragStartX;
    const dy = e.clientY - state.dragStartY;
    const distanceSquared = dx * dx + dy * dy;
    if (!state.isDragging && distanceSquared < DRAG_THRESHOLD * DRAG_THRESHOLD) {
      return;
    }

    // Start dragging
    if (!state.isDragging) {
      state.isDragging = true;
      handleDragStart(e, state.draggedNodeType);
    }

    // Already in dragging process
    dragPreviewNode.value.id = state.draggedNodeId;
    dragPreviewNode.value.left = e.clientX - NODE_DRAG_OFFSET_X;
    dragPreviewNode.value.top = e.clientY - NODE_DRAG_OFFSET_Y;

    handlePaneDragOver(e);
  };

  const handleNodeMouseUp = (e) => {
    if (!isNodeMouseDown.value) return;

    document.removeEventListener('mousemove', handleNodeMouseMove);
    document.removeEventListener('mouseup', handleNodeMouseUp);

    if (!state.isDragging) {
      isNodeMouseDown.value = false;
      state.draggedNodeId = null;
      state.draggedNodeType = null;
      dragPreviewNode.value.id = null;
      return;
    }

    handlePaneDrop(e, WorkflowConstant.DropType.MOVE);

    isNodeMouseDown.value = false;
    state.isDragging = false;
    state.draggedNodeId = null;
    state.draggedNodeType = null;
    dragPreviewNode.value.id = null;
  };

  const handlePaneClick = () => {
    if (editorMode.value === WorkflowConstant.EditorMode.CODE.value) {
      toggleClassOnVueFlowElement(selectedNode.value?.id, WorkflowConstant.ClassName.HIGHLIGHTED);
      selectedNode.value = null;
    }
  };

  const findIntermediateNodes = (edge) => {
    const startTarget = edge.target;
    const intermediateNodes = [];
    const visitedNodes = new Set();

    let currentNode = findNode(startTarget);
    if (!currentNode) return intermediateNodes;

    while (currentNode) {
      if (visitedNodes.has(currentNode.id)) {
        break; // Stop if we have visited this node to avoid infinite loops
      }

      intermediateNodes.push(currentNode);
      visitedNodes.add(currentNode.id);

      const connectedEdges = getConnectedEdges(currentNode.id);
      const nextEdges = connectedEdges.filter(edge => edge.source === currentNode.id);
      if (!nextEdges.length) break;

      let foundNextNode = false;
      for (const nextEdge of nextEdges) {
        const nextNode = findNode(nextEdge.target);
        if (nextNode && nextNode.id !== startTarget) {
          currentNode = nextNode;
          foundNextNode = true;
          break; // Stop if we found the next node
        } else if (nextNode && nextNode.id === startTarget) {
          intermediateNodes.push(nextNode);
          return intermediateNodes; // Stop if we found the start node
        }
      }
      if (!foundNextNode) break;
    }

    return intermediateNodes;
  };

  const getRightAngleEdgeYDistance = ({
    edge,
    startY,
  }) => {
    const intermediateNodes = findIntermediateNodes(edge);
    if (intermediateNodes.length === 0) return;
    return Math.max(...intermediateNodes.map((node) => {
      const parentNode = findNode(node.parentNode);
      return (parentNode ? parentNode.position.y + node.position.y : node.position.y) + node.dimensions.height;
    })) - startY;
  };

  const findSiblingStates = (stateName) => {
    let states = [];
    let found = false;
    const traverse = (value) => {
      if (found) return;
      if (value && typeof value === 'object') {
        for (const key in value) {
          if (key === 'states' && Array.isArray(value[key])) {
            if (!stateName) {
              states = value[key];
              return;
            }
            const names = value[key].map(state => state.name);
            if (names.includes(stateName)) {
              states = value[key];
              found = true;
              return;
            }
          }
          traverse(value[key]);
          if (found) break;
        }
      }
    };
    traverse(definition.value);
    return states;
  };

  const getConnectedEdgeIds = (nodeId) => {
    const nodeConnection = nodeConnectionMap.value.get(nodeId);
    if (!nodeConnection) return;
    const { previousEdges, nextEdges, fallbackEdges, fallbackFromEdges } = nodeConnection;
    const edgeIdsSet = new Set();
    previousEdges.forEach(edge => edgeIdsSet.add(edge.id));
    nextEdges.forEach(edge => edgeIdsSet.add(edge.id));
    fallbackEdges.forEach(edge => edgeIdsSet.add(edge.id));
    fallbackFromEdges.forEach(edge => edgeIdsSet.add(edge.id));
    return Array.from(edgeIdsSet);
  };

  const toggleConnectedEdgesHighlighted = (nodeId) => {
    const connectedEdgeIds = getConnectedEdgeIds(nodeId);
    connectedEdgeIds.forEach((edgeId) => {
      toggleClassOnVueFlowElement(edgeId, WorkflowConstant.ClassName.HIGHLIGHTED);
      const parentSvg = getEdgeParentSvg(edgeId);
      parentSvg.classList.toggle(WorkflowConstant.ClassName.HIGHLIGHTED);
      toggleMarkerEndHighlighted(edgeId);
    });
  };

  const updateNodesCollapseStatus = () => {
    const allParentNodes = stagingNodes.value.filter(node => node.isParent);
    const allCollapsed = allParentNodes.every(node => node.data.isCollapsed);
    const allExpanded = allParentNodes.every(node => !node.data.isCollapsed);
    nodesCollapseStatus.value = allCollapsed
      ? WorkflowConstant.NodesCollapseStatus.ALL_COLLAPSED
      : allExpanded
        ? WorkflowConstant.NodesCollapseStatus.ALL_EXPANDED
        : WorkflowConstant.NodesCollapseStatus.MIXED;
  };

  const setCollapseForNodeAndDescendants = (node, isCollapsed) => {
    const descendantNodes = findDescendantNodes(node.id);
    if (descendantNodes.length === 0) return;
    updateNodeData(node.id, { isCollapsed });
    descendantNodes.forEach((node) => {
      updateNode(node.id, { hidden: isCollapsed });
      updateNodeData(node.id, { isCollapsed });
    });
  };

  const setNodeCollapse = (nodeId, isCollapsed) => {
    const node = stagingNodes.value.find(node => node.id === nodeId);
    if (!node) return;
    updateUndoStack();
    setCollapseForNodeAndDescendants(node, isCollapsed);
    updateNodesCollapseStatus();
    organizeFlow({
      enableUpdateUndoStack: false,
    });
  };

  const setAllNodesCollapse = async (isCollapsed) => {
    updateUndoStack();
    const rootParentNodes = stagingNodes.value.filter(node => node.isParent && !node.parentNode);
    rootParentNodes.forEach((node) => {
      setCollapseForNodeAndDescendants(node, isCollapsed);
    });
    updateNodesCollapseStatus();
    await organizeFlow({
      enableUpdateUndoStack: false,
    });
    fitView();
  };

  const setSwappable = (value) => {
    isSwappable.value = value;
  };

  return {
    addStagingEdges,
    addStagingNodes,
    closeConfigForm,
    createChoiceHandler,
    createParallelHandler,
    definition,
    dragPreviewNode,
    duplicateNode,
    editorMode,
    findDescendantNodes,
    findRouteEndNode,
    findSiblingStates,
    findWorkflowEndNode,
    findWorkflowStartNode,
    getEdgeParentSvg,
    getRightAngleEdgeYDistance,
    getSimulatedOutputMapFromAsl,
    getStatesFromNodes,
    handleDragStart,
    handleInit,
    handleNodeClick,
    handleNodeMouseDown,
    handleNodeMouseMove,
    handleNodeMouseUp,
    handleNodesInitialized,
    handlePaneClick,
    handlePaneDragOver,
    handlePaneDrop,
    hoveredNodeId,
    inputSchema,
    isAllNodesCollapsed,
    isInteractive,
    isNodeMouseDown,
    isRedoDisabled,
    isSwappable,
    isUndoDisabled,
    organizeFlow,
    outputSchema,
    reconnectToFallbackNode,
    reconnectToNextNode,
    redo,
    removeNode,
    resetUndoRedoStacks,
    selectedNode,
    selectedNodeForm,
    setAllNodesCollapse,
    setNodeCollapse,
    setSwappable,
    simulatedOutputMap,
    stagingEdges,
    stagingNodes,
    stateMemoryInputSelector,
    undo,
    updateDefinitionFromNodes,
    updateFlow,
    updateNodeConnectionMap,
    updateNodesCollapseStatus,
    updateSimulatedOutputMap,
    updateStagingEdge,
    updateStagingNode,
    updateUndoStack,
    updateWorkflowChain,
    useExternalMemoryInput,
  };
};
