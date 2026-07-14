<script setup>
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Workflow } from '~/models/server/workflow';
import { Flow } from '~/models/workflow/flow';
import FlowNodes from '~/models/workflow/state/FlowNodes';
import TaskNodes from '~/models/workflow/state/TaskNodes';

const {
  fitView,
} = useVueFlow();

const {
  handleInit,
  handleNodesInitialized,
  nodesCollapseStatus,
  organizeFlow,
  setAllNodesCollapse,
  setNodeCollapse,
} = useWorkflow();

const props = defineProps({
  workflow: {
    type: Object,
    required: true,
  },
  height: {
    type: Number,
    default: 600,
  },
});

const state = reactive({
  nodes: [],
  edges: [],
  isInitializing: true,
});

const initializeState = () => {
  const workflow = new Workflow(props.workflow);
  const flow = new Flow();
  flow.build({
    startAt: workflow.definition.startAt,
    states: workflow.definition.states,
    inputSchema: workflow.inputSchema,
    outputSchema: workflow.outputSchema,
  });
  state.nodes = flow.nodes;
  state.edges = flow.edges;
};

const handleVueFlowNodesInitialized = async () => {
  await handleNodesInitialized({
    enableFitView: true,
    enableOrganizeFlow: true,
    enableSetViewport: true,
  });
  await organizeFlow();
  await fitView();
  // For better visual experience
  await delay(1000);
  state.isInitializing = false;
};

initializeState();
</script>

<template>
  <AppDetailsCard :title="$t('__fieldWorkflow')">
    <template #body>
      <v-sheet
        :height="props.height"
        color="transparent"
        class="position-relative"
      >
        <VueFlow
          v-if="state.nodes && state.nodes.length > 0"
          :min-zoom="0.1"
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
            v-for="node in FlowNodes"
            :key="node.name"
            #[`node-${node.name}`]="p"
          >
            <component
              v-bind="p"
              :is="node.component"
              :node-data="p.data"
              :nodes-collapse-status="nodesCollapseStatus"
              :on-node-collapse-set="setNodeCollapse"
              readonly
            />
          </template>
          <template
            v-for="node in TaskNodes"
            :key="node.name"
            #[`node-${node.name}`]="p"
          >
            <component
              v-bind="p"
              :is="node.component"
              :node-data="p.data"
              readonly
            />
          </template>
          <CustomVueFlowBackground />
          <CustomVueFlowControls
            :show-interactive="false"
            :on-collapse-toggle="setAllNodesCollapse"
          />
        </VueFlow>
        <CustomVueFlowLoader
          :loading="state.isInitializing"
          background-color="backgroundScale2"
        />
      </v-sheet>
    </template>
  </AppDetailsCard>
</template>
