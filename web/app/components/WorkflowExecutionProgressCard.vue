<script setup>
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { StateConstant, StatusConstant, WorkflowConstant, WorkflowExecutionConstant } from '~/constants';
import { Workflow } from '~/models/server/workflow';
import { Flow } from '~/models/workflow/flow';

/**
 * @import { WorkflowExecution } from '~/models/server/workflowExecution';
 */
const props = defineProps({
  /**
   * @type {Workflow}
   */
  workflow: {
    type: Object,
    default: null,
  },
  /**
   * @type {WorkflowExecution}
   */
  workflowExecution: {
    type: Object,
    default: null,
  },
  useWorkflowOptions: {
    type: Object,
    default: () => {},
  },
});

const {
  findNode,
  updateNode,
} = useVueFlow();
const {
  handleInit,
  handleNodesInitialized,
} = useWorkflow(props.useWorkflowOptions);
const {
  fetchCompleteHistory,
  historyByState,
} = useWorkflowExecutionHistory();

const state = reactive({
  isInitializing: true,
  isFetchingHistory: false,
  fetchHistoryTimer: null,
  edges: [],
  nodes: [],
});

const allNodeTypes = [
  ...Object.values(StateConstant.Type),
  ...Object.values(StateConstant.ActionType),
  ...Object.values(StateConstant.PseudoType),
];

const initializeState = async () => {
  const workflow = new Workflow(props.workflow);
  workflow.definition = props.workflowExecution.workflowDefinition || props.workflow.definition;
  const flow = new Flow();
  flow.build({
    flowType: WorkflowConstant.FlowType.EXECUTION.value,
    startAt: workflow.definition.startAt,
    states: workflow.definition.states,
    inputSchema: workflow.inputSchema,
    outputSchema: workflow.outputSchema,
  });
  state.nodes = flow.nodes;
  state.edges = flow.edges;
  await fetchCompleteHistory({
    executionArn: props.workflowExecution.executionArn,
  });
  state.isInitializing = false;
};

if (props.workflow && props.workflowExecution?.executionArn) {
  initializeState();
}

const handleVueFlowNodesInitialized = async () => {
  await handleNodesInitialized({
    enableFitView: state.nodes.length < 8,
    enableOrganizeFlow: true,
    enableSetViewport: false,
  });
  mapStateStatusToNode();
};

const mapStateStatusToNode = () => {
  for (const node of state.nodes) {
    const stateName = node.data?.stateDefinition?.name;
    if (!stateName) continue;
    const history = historyByState.value.findLast(item => item.name === stateName);
    if (history && history.status) {
      const originalNode = findNode(node.id);
      if (!originalNode) continue;
      updateNode(node.id, {
        ...originalNode,
        data: {
          ...originalNode.data,
          executionStatus: history.status,
        },
      });
    }
  }
};

watch(() => historyByState.value, (after) => {
  if (!after) return;
  mapStateStatusToNode();
});

watch(() => props.workflowExecution.stopTs, (after, before) => {
  if (!before && after) {
    // Clear the fetch history timer when execution is stopped
    clearInterval(state.fetchHistoryTimer);
    // Last fetch to make sure we have the latest history
    fetchCompleteHistory({
      executionArn: props.workflowExecution.executionArn,
    });
  }
});

const safeFetchCompleteHistory = async (params) => {
  if (state.isFetchingHistory) return;
  state.isFetchingHistory = true;
  await fetchCompleteHistory(params);
  state.isFetchingHistory = false;
};

const createFetchHistoryTimer = () => {
  return setInterval(() => {
    safeFetchCompleteHistory({
      executionArn: props.workflowExecution.executionArn,
    });
  }, WorkflowExecutionConstant.Base.FETCH_INTERVAL);
};

onMounted(() => {
  // Create fetch history timer only if execution is still running
  if (!props.workflowExecution.stopTs) {
    state.fetchHistoryTimer = createFetchHistoryTimer();
  }
});

onBeforeUnmount(() => {
  state.isInitializing = true;
  clearInterval(state.fetchHistoryTimer);
});
</script>

<template>
  <AppDetailsCard :title="props.workflowExecution?.stopTs ? $t('__fieldExecutionFlow') : $t('__fieldExecutionProgress')">
    <template #body>
      <v-sheet
        :height="400"
        color="transparent"
        class="position-relative"
      >
        <VueFlow
          :min-zoom="0.2"
          :max-zoom="4"
          :elements-selectable="false"
          :nodes-draggable="false"
          :nodes-connectable="false"
          :default-viewport="{ x: 0, y: 0, zoom: 1 }"
          @init="() => handleInit({
            initialNodes: state.nodes,
            initialEdges: state.edges,
          })"
          @nodes-initialized="handleVueFlowNodesInitialized"
        >
          <template #edge-custom="customProps">
            <WorkflowCustomEdge v-bind="customProps" />
          </template>
          <template #edge-fallback="fallbackProps">
            <WorkflowCustomEdge v-bind="fallbackProps" />
          </template>
          <template
            v-for="type in allNodeTypes"
            :key="type.value"
            #[`node-${type.value}`]="props"
          >
            <WorkflowProgressNode
              v-bind="props"
              :node-type="type.value"
            />
          </template>
          <CustomVueFlowBackground />
          <CustomVueFlowControls :show-interactive="false" />
        </VueFlow>
        <CustomVueFlowLoader
          :loading="state.isInitializing"
          background-color="backgroundScale2"
        />
        <div class="legend">
          <template
            v-for="status in [
              StatusConstant.Runtime.RUNNING.value,
              StatusConstant.Runtime.SUCCEEDED.value,
              StatusConstant.Runtime.FAILED.value,
              StatusConstant.Runtime.CANCELED.value,
            ]"
            :key="status"
          >
            <AppChip
              :color="status.toLowerCase()"
              variant="flat"
              :text="$t(findField(StatusConstant.Runtime, status, 'i18nTitle') || '__fieldStatusUnknown')"
              class="mr-2"
            />
          </template>
        </div>
      </v-sheet>
    </template>
  </AppDetailsCard>
</template>

<style lang="scss" scoped>
.legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
}
</style>
