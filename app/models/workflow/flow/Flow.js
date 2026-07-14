import { StateConstant, WorkflowConstant, WorkflowExecutionConstant } from '~/constants';
import { Edge, NodeFactory } from '~/models/workflow';
import { NodeHandler } from '~/models/workflow/flow';
import { EndNode, EndNodeData } from '~/models/workflow/state/end';
import { SlotNode } from '~/models/workflow/state/slot';
import { StartNode, StartNodeData } from '~/models/workflow/state/start';

/**
 * @import { Workflow } from '~/models/server/workflow'
 * @import { Node } from '~/models/workflow'
 * @import { StateDefinition } from '~/models/workflow/state'
 */

class Flow {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  /**
   * @param {number} branchIndex
   * @param {boolean} createStartNode
   * @param {string} flowType
   * @param {object} inputSchema
   * @param {object} outputSchema
   * @param {string} parentNode
   * @param {string} startAt
   * @param {string} startNodeId
   * @param {object} stateMemoryInputSelector
   * @param {StateDefinition[]} states
   * @param {boolean} useExternalMemoryInput
   */
  build({
    branchIndex,
    createStartNode = true,
    flowType = WorkflowConstant.FlowType.DEFINITION.value,
    inputSchema,
    outputSchema,
    parentNode,
    startAt,
    startNodeId,
    stateMemoryInputSelector,
    states,
    useExternalMemoryInput = false,
  } = {}) {
    const isFlowTypeExecution = flowType === WorkflowConstant.FlowType.EXECUTION.value;

    const connectNextNode = ({
      node,
      edgeId,
      sourceHandle,
      stateDefinition = {},
      target,
      branchIndex,
    }) => {
      const { end, next } = stateDefinition;
      if (end) {
        const parentNodeId = node.parentNode;
        const targetEndNode = this.nodes.find(
          node =>
            node.parentNode === parentNodeId
            && node.type === StateConstant.PseudoType.END.value
            && node.data?.branchIndex === branchIndex,
        );

        const edge = new Edge({
          id: edgeId || strUtils.uuid(),
          source: node.id,
          sourceHandle,
          target: target || targetEndNode.id,
        });

        this.edges.push(edge);
      } else if (next) {
        const edge = new Edge({
          id: edgeId || strUtils.uuid(),
          source: node.id,
          sourceHandle,
          target: target || this.nodes.find(node => node.data.stateDefinition?.name === next)?.id,
        });
        this.edges.push(edge);
      } else if (node.type === StateConstant.Type.SUCCEED.value
        || node.type === StateConstant.Type.FAIL.value) {
        const parentNodeId = node.parentNode;
        const endNode = this.nodes.find(node => node.parentNode === parentNodeId && node.type === StateConstant.PseudoType.END.value);
        const edge = new Edge({
          id: edgeId || strUtils.uuid(),
          source: node.id,
          sourceHandle,
          target: endNode.id,
        });
        this.edges.push(edge);
      } else if (target) {
        const edge = new Edge({
          id: edgeId || strUtils.uuid(),
          source: node.id,
          sourceHandle,
          target,
        });
        this.edges.push(edge);
      }
    };

    const connectFallbackNode = ({
      node,
      catchItem,
    }) => {
      const fallbackNode = this.nodes.find(n => n.data.stateDefinition?.name === catchItem.next);
      if (!fallbackNode) return;
      const edge = new Edge({
        id: catchItem.id,
        type: WorkflowConstant.EdgeType.FALLBACK,
        source: node.id,
        sourceHandle: catchItem.id,
        target: fallbackNode.id,
      });
      this.edges.push(edge);
    };

    const createEdges = ({
      startAt,
      states,
      parentNode,
      branchIndex,
    }) => {
      const startNodeId = this.nodes.find(node => node.type === StateConstant.PseudoType.START.value && node.parentNode === parentNode).id;
      const startAtNodeId = this.nodes.find(node => node.data.stateDefinition?.name === startAt)?.id;
      if (startAtNodeId) {
        const startNodeEdge = new Edge({
          id: strUtils.uuid(),
          source: startNodeId,
          target: startAtNodeId,
        });
        this.edges.push(startNodeEdge);
      }
      if (states.length === 0) {
        const startNode = this.nodes.find(node => node.type === StateConstant.PseudoType.START.value && node.parentNode === parentNode);
        const slotNode = this.nodes.find(node => node.type === StateConstant.PseudoType.SLOT.value && node.parentNode === parentNode);
        connectNextNode({
          node: startNode,
          target: slotNode.id,
        });
        connectNextNode({
          node: slotNode,
          target: endNodeId,
        });
        return;
      }
      for (const state of states) {
        const node = this.nodes.find(node => node.data.stateDefinition?.name === state.name);
        if (node.type === StateConstant.PseudoType.START.value
          || node.type === StateConstant.PseudoType.END.value) {
          continue;
        }
        if (node.type === StateConstant.Type.CHOICE.value) {
          const choiceSlotNodes = this.nodes.filter(n => n.type === StateConstant.PseudoType.SLOT.value && n.parentNode === node.parentNode);
          let slotIndex = 0;
          // Make sure the edge for default choice item is created first
          const defaultChoiceItem = node.data.stateDefinition.choices.find(choiceItem => choiceItem.isDefault);
          const isDefaultEnd = defaultChoiceItem.stateDefinition.end === true;
          connectNextNode({
            node,
            edgeId: defaultChoiceItem.id,
            sourceHandle: defaultChoiceItem.sourceHandle,
            stateDefinition: defaultChoiceItem.stateDefinition,
            target: isDefaultEnd ? choiceSlotNodes[slotIndex++]?.id : null,
            branchIndex,
          });
          const choiceItems = node.data.stateDefinition.choices.filter(choiceItem => !choiceItem.isDefault);
          for (const choiceItem of choiceItems) {
            const isEnd = choiceItem.stateDefinition.end === true;
            connectNextNode({
              node,
              edgeId: choiceItem.id,
              sourceHandle: choiceItem.sourceHandle,
              stateDefinition: choiceItem.stateDefinition,
              target: isEnd ? choiceSlotNodes[slotIndex++]?.id : null,
              branchIndex,
            });
          }
          continue;
        }
        const catches = node.data.stateDefinition.errorHandling?.catches;
        if (catches && catches.length > 0) {
          for (const catchItem of catches) {
            connectFallbackNode({
              node,
              catchItem,
            });
          }
        }
        connectNextNode({
          node,
          stateDefinition: node.data.stateDefinition,
          branchIndex,
        });
      }
    };

    const nodeHandler = new NodeHandler();
    const endNodeId = strUtils.uuid();
    const startNode = new StartNode({
      id: startNodeId || strUtils.uuid(),
      parentNode,
      data: new StartNodeData({
        startAt,
        inputSchema,
        stateMemoryInputSelector,
        useExternalMemoryInput,
      }),
      dimensions: isFlowTypeExecution
        ? {
            height: WorkflowExecutionConstant.ProgressNodeDimension.TERMINAL_NODE_HEIGHT,
            width: WorkflowExecutionConstant.ProgressNodeDimension.TERMINAL_NODE_WIDTH,
          }
        : undefined,
    });
    const endNode = new EndNode({
      id: endNodeId,
      parentNode,
      data: new EndNodeData({
        branchIndex,
        outputSchema,
      }),
      dimensions: isFlowTypeExecution
        ? {
            height: WorkflowExecutionConstant.ProgressNodeDimension.TERMINAL_NODE_HEIGHT,
            width: WorkflowExecutionConstant.ProgressNodeDimension.TERMINAL_NODE_WIDTH,
          }
        : undefined,
    });
    if (createStartNode) {
      this.nodes.push(startNode);
    }
    this.nodes.push(endNode);

    if (states.length === 0) {
      const slotNode = new SlotNode({
        id: strUtils.uuid(),
      });
      this.nodes.push(slotNode);
    }

    states.forEach((state) => {
      const type = state.type;
      const nodeType = type === StateConstant.Type.TASK.value
        ? (findField(StateConstant.ActionType, state.parameters.payload?.actionType, 'value') || StateConstant.ActionType.UNKNOWN.value)
        : findField(StateConstant.Type, type, 'value');
      const nodeId = strUtils.uuid();
      const node = NodeFactory.create({
        id: nodeId,
        type: nodeType,
        parentNode,
        data: {
          stateDefinition: state,
          isFormGroupValid: true,
        },
        dimensions: isFlowTypeExecution
          ? {
              height: WorkflowExecutionConstant.ProgressNodeDimension.GENERAL_NODE_HEIGHT,
              width: WorkflowExecutionConstant.ProgressNodeDimension.GENERAL_NODE_WIDTH,
            }
          : undefined,
      });
      if (nodeType === StateConstant.Type.CHOICE.value) {
        node.data.stateDefinition.choices.forEach((choice) => {
          // Assign a new id to create unique rule edge
          choice.id = strUtils.uuid();
        });
      }
      this.nodes.push(node);
      if (nodeType === StateConstant.Type.MAP.value) {
        if (state.itemProcessor.states.length === 0) {
          const {
            startNode,
            endNode,
            slotNode,
            startEdge,
            endEdge,
          } = nodeHandler.createPlaceholders({
            parentNode: nodeId,
          });
          this.nodes.push(startNode, endNode, slotNode);
          this.edges.push(startEdge, endEdge);
          return;
        }
        this.build({
          flowType,
          parentNode: nodeId,
          startAt: state.itemProcessor.startAt,
          states: state.itemProcessor.states,
        });
      }
      if (nodeType === StateConstant.Type.PARALLEL.value) {
        const startNodeId = strUtils.uuid();
        const branchCount = state.branches.length;
        if (branchCount === 0) {
          Array.from({ length: 2 }).forEach((_, index) => {
            const { startNode, endNode, slotNode, startEdge, endEdge } = nodeHandler.createPlaceholders({
              startNodeId,
              parentNode: nodeId,
            });
            if (index === 0) this.nodes.push(startNode);
            this.nodes.push(endNode, slotNode);
            this.edges.push(startEdge, endEdge);
          });
        } else if (branchCount === 1) {
          const branch = state.branches[0];
          this.build({
            flowType,
            parentNode: nodeId,
            startAt: branch.startAt,
            startNodeId,
            states: branch.states,
          });
          const { endNode, slotNode, startEdge, endEdge } = nodeHandler.createPlaceholders({
            startNodeId,
            parentNode: nodeId,
          });
          this.nodes.push(endNode, slotNode);
          this.edges.push(startEdge, endEdge);
        } else {
          state.branches.forEach((branch, index) => {
            this.build({
              branchIndex: index,
              createStartNode: index === 0,
              flowType,
              parentNode: nodeId,
              startAt: branch.startAt,
              startNodeId,
              states: branch.states,
            });
          });
        }
      }
    });

    createEdges({
      startAt,
      states,
      parentNode,
      branchIndex,
    });
  };
}

export default Flow;
