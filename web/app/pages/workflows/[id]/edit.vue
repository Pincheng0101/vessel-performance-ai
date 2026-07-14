<script setup>
import { useVueFlow } from '@vue-flow/core';
import { ResourceConstant, StateConstant, StatusConstant } from '~/constants';
import { UiData, WorkflowDraftValue } from '~/models/server/uiData';
import { Workflow } from '~/models/server/workflow';
import { Edge, NodeFactory } from '~/models/workflow';
import { Flow } from '~/models/workflow/flow';
import { WorkflowDefinition } from '~/models/workflow/state';

/**
 * @import { Workflow } from '~/models/server/workflow'
 * @import { Resource } from '~/models/server'
 */

definePageMeta({
  layout: 'editor',
});

const { t } = useI18n();
const dayjs = useDayjs();
const route = useRoute();
const { nodes } = useVueFlow();
const server = useServer();
const {
  findWorkflowEndNode,
  findWorkflowStartNode,
  getStatesFromNodes,
  inputSchema,
  outputSchema,
  stateMemoryInputSelector,
  useExternalMemoryInput,
} = useWorkflow();
const { hasWritePermission } = useResourcePermission();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type { Workflow }
   */
  workflow: null,
  updating: false,
  executionRunning: false,
  executionData: null,
  executionError: null,
  resources: null,
  resourcesPending: true,
  initialNodes: null,
  initialEdges: null,
  draftUpdateTime: null,
  isDraftUpdating: false,
  stopPolling: true,
  hasPermission: null,
});

breadcrumbStore.setLoading(true);

state.hasPermission = await hasWritePermission(ResourceConstant.Type.WORKFLOW.value);

const draftKey = `draft-${route.params.id}`;
const { data, error } = await server.workflow.get({
  workflowId: route.params.id,
}, {
  lazy: false,
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});
const { data: draftData, error: draftError } = await server.uiData.get({ key: draftKey }, { lazy: false });

const isDraftUpToDate = computed(() => draftData.value?.value?.updatedTs >= data.value.updatedTs);
const draftDefinition = computed(() => draftData.value?.value?.definition);
const draftInputSchema = computed(() => draftData.value?.value?.inputSchema);
const draftOutputSchema = computed(() => draftData.value?.value?.outputSchema);
const draftStateMemoryInputSelector = computed(() => draftData.value?.value?.stateMemoryInputSelector);
const draftUseExternalMemoryInput = computed(() => draftData.value?.value?.useExternalMemoryInput);

const initializeWorkflow = () => {
  if (!state.workflow) {
    state.workflow = new Workflow(data.value);
  }
};

const initializeGraphStates = async (nodes, edges) => {
  const queries = nodes.map(NodeFactory.toResourceQueries).flat();
  const { data, pending } = await server.multiRequest.get(queries, { lazy: false });
  state.resources = data.value;
  state.resourcesPending = pending.value;
  state.initialNodes = nodes;
  state.initialEdges = edges;
};

// The workflow and draft requests above are awaited with `lazy: false`, so their
// data is already settled here. Initialize directly instead of waiting for a
// `pending` transition in a watcher (which would never fire once the data is ready)
if (error.value) {
  console.error(error.value);
} else {
  initializeWorkflow();

  const isWorkflowDataReady = data.value && draftData.value;

  if (isWorkflowDataReady && isDraftUpToDate.value) {
    // When both workflow and draft data are available and up-to-date, initialize graph with draft data
    if (draftDefinition.value) {
      // When draft definition is available, initialize flow with draft definition, then initialize graph states
      const flow = new Flow();
      flow.build({
        startAt: draftDefinition.value.startAt,
        states: draftDefinition.value.states,
        inputSchema: draftInputSchema.value || state.workflow.inputSchema,
        outputSchema: draftOutputSchema.value || state.workflow.outputSchema,
        stateMemoryInputSelector: draftStateMemoryInputSelector.value || state.workflow.stateMemoryInputSelector,
        useExternalMemoryInput: draftUseExternalMemoryInput.value || state.workflow.useExternalMemoryInput,
      });
      await initializeGraphStates(flow.nodes, flow.edges);
    } else {
      // When draft definition is not available, initialize graph states with draft nodes and edges
      const nodes = draftData.value.value.nodes.map(NodeFactory.create);
      const edges = draftData.value.value.edges.map(edge => new Edge(edge));
      await initializeGraphStates(nodes, edges);
    }
    state.draftUpdateTime = draftData.value.value.updatedTs;
  } else if ((isWorkflowDataReady && !isDraftUpToDate.value) || draftError.value) {
    // When workflow data is outdated or draft data is unavailable, initialize flow first, then initialize graph states
    const flow = new Flow();
    flow.build({
      startAt: state.workflow.definition.startAt,
      states: state.workflow.definition.states,
      inputSchema: state.workflow.inputSchema,
      outputSchema: state.workflow.outputSchema,
      stateMemoryInputSelector: state.workflow.stateMemoryInputSelector,
      useExternalMemoryInput: state.workflow.useExternalMemoryInput,
    });
    await initializeGraphStates(flow.nodes, flow.edges);
  }
}

/**
 * @param {Resource} resource
 */
const updateResources = (resource) => {
  const listKey = findField(ResourceConstant.Type, resource.resourceType, 'listKey');
  if (listKey && state.resources) {
    state.resources[listKey][resource.id] = resource;
  }
};

/**
 * @param {Workflow} formData
 */
const handleWorkflowConfigChange = async (formData) => {
  const { error } = await server.workflow.update({
    workflowId: state.workflow.workflowId,
    workflowName: formData.workflowName,
    definition: WorkflowDefinition.toAsl({
      ...state.workflow.definition,
      comment: formData.definition.comment,
    }),
  });
  if (error.value) {
    return;
  }
  state.workflow.workflowName = formData.workflowName;
  state.workflow.definition.comment = formData.definition.comment;
  breadcrumbStore.setBreadcrumb(route.params.id, state.workflow.workflowName);
  snackbarStore.setActionSuccess('__actionUpdate');
};

/**
 * @param {Workflow} formData
 */
const handleWorkflowInputSchemaChange = (formData) => {
  state.workflow.inputSchema = formData.inputSchema;
};

/**
 * @param {Workflow} formData
 */
const handleWorkflowOutputSchemaChange = (formData) => {
  state.workflow.outputSchema = formData.outputSchema;
};

const updateDraft = async () => {
  state.isDraftUpdating = true;
  const startNode = findWorkflowStartNode();
  const states = getStatesFromNodes();
  const definition = new WorkflowDefinition({
    startAt: startNode.data.startAt,
    states,
    comment: state.workflow.definition.comment,
  });
  const { error } = await server.uiData.set(new UiData({
    key: draftKey,
    value: new WorkflowDraftValue({
      definition,
      inputSchema: inputSchema.value,
      outputSchema: outputSchema.value,
      updatedTs: dayjs().unix(),
      stateMemoryInputSelector: stateMemoryInputSelector.value,
      useExternalMemoryInput: useExternalMemoryInput.value,
    }),
  }));
  if (error.value) {
    state.isDraftUpdating = false;
    return;
  }
  // For better visual experience
  await delay(1000);
  state.isDraftUpdating = false;
  state.draftUpdateTime = dayjs().unix();
};

const updateWorkflow = async () => {
  updateDraft();
  const startNode = findWorkflowStartNode();
  const endNode = findWorkflowEndNode();
  const states = getStatesFromNodes();
  if (!startNode.data.startAt || states.length === 0) return;

  const invalidNodes = nodes.value.filter(node =>
    !(Object.values(StateConstant.PseudoType).map(type => type.value).includes(node.type))
    && !node.data.isFormGroupValid);
  if (invalidNodes.length > 0) {
    const names = invalidNodes.map(node => `- ${node.data.stateDefinition.name}`).join('\n');
    snackbarStore.setFailure(t('__messageWorkflowUpdateFailed', { names }));
    return;
  }

  const definition = new WorkflowDefinition({
    startAt: startNode.data.startAt,
    states,
    comment: state.workflow.definition.comment,
  });

  state.workflow.definition = definition;
  state.workflow.inputSchema = startNode.data.inputSchema;
  state.workflow.outputSchema = endNode.data.outputSchema;
  state.workflow.stateMemoryInputSelector = startNode.data.stateMemoryInputSelector;
  state.workflow.useExternalMemoryInput = startNode.data.useExternalMemoryInput;

  const { error } = await server.workflow.update({
    ...state.workflow,
    definition: WorkflowDefinition.toAsl(definition),
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  state.workflow.updatedTs = dayjs().unix();
};

// Add overscroll-behavior-x to <html> to prevent swipe-back gesture.
onMounted(() => {
  document.documentElement.style.overscrollBehaviorX = 'none';
});

onBeforeUnmount(() => {
  document.documentElement.style.overscrollBehaviorX = 'auto';
});
</script>

<template>
  <template v-if="state.hasPermission">
    <WorkflowEditor
      v-if="state.workflow && state.initialNodes && state.initialEdges && !state.resourcesPending"
      :draft-update-time="state.draftUpdateTime"
      :enable-organize-flow="!(draftData && isDraftUpToDate) || (!!draftDefinition && isDraftUpToDate)"
      :initial-edges="state.initialEdges"
      :initial-nodes="state.initialNodes"
      :is-draft-up-to-date="isDraftUpToDate"
      :is-draft-updating="state.isDraftUpdating"
      :on-draft-update="updateDraft"
      :on-resources-update="updateResources"
      :on-workflow-config-change="handleWorkflowConfigChange"
      :on-workflow-input-schema-change="handleWorkflowInputSchemaChange"
      :on-workflow-output-schema-change="handleWorkflowOutputSchemaChange"
      :on-workflow-update="updateWorkflow"
      :resources="state.resources"
      :workflow="state.workflow"
    />
  </template>
  <template v-else>
    <ResourceErrorCard
      :label="$t('__fieldWorkflow')"
      :status-code="StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
</template>
