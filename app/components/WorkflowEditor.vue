<script setup>
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { KeyboardConstant, ResourceConstant, StateConstant, WorkflowConstant } from '~/constants';
import { NodeFactory } from '~/models/workflow';
import { Flow } from '~/models/workflow/flow';
import { WorkflowDefinition } from '~/models/workflow/state';
import FlowNodes from '~/models/workflow/state/FlowNodes';
import TaskNodes from '~/models/workflow/state/TaskNodes';

const props = defineProps({
  draftUpdateTime: {
    type: Number,
    default: null,
  },
  enableOrganizeFlow: {
    type: Boolean,
    default: true,
  },
  initialEdges: {
    type: Array,
    required: true,
  },
  initialNodes: {
    type: Array,
    required: true,
  },
  isDraftUpToDate: {
    type: Boolean,
    default: true,
  },
  isDraftUpdating: {
    type: Boolean,
    default: false,
  },
  onDraftUpdate: {
    type: Function,
    default: null,
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
  onWorkflowConfigChange: {
    type: Function,
    required: true,
  },
  onWorkflowInputSchemaChange: {
    type: Function,
    required: true,
  },
  onWorkflowOutputSchemaChange: {
    type: Function,
    required: true,
  },
  onWorkflowUpdate: {
    type: Function,
    required: true,
  },
  resources: {
    type: Object,
    default: null,
  },
  updating: {
    type: Boolean,
    default: false,
  },
  workflow: {
    type: Object,
    default: null,
  },
});

const router = useRouter();
const { nodes } = useVueFlow();

const {
  closeConfigForm,
  definition,
  editorMode,
  findRouteEndNode,
  handleDragStart,
  handleInit,
  handleNodeClick,
  handleNodesInitialized,
  handlePaneClick,
  handlePaneDragOver,
  handlePaneDrop,
  isInteractive,
  isRedoDisabled,
  isSwappable,
  isUndoDisabled,
  nodesCollapseStatus,
  organizeFlow,
  reconnectToFallbackNode,
  reconnectToNextNode,
  redo,
  resetUndoRedoStacks,
  selectedNode,
  selectedNodeForm,
  setAllNodesCollapse,
  setNodeCollapse,
  setSwappable,
  undo,
  updateDefinitionFromNodes,
  updateFlow,
  updateNodesCollapseStatus,
  updateStagingNode,
  updateUndoStack,
  updateWorkflowChain,
} = useWorkflow();

const { registerKeyboardShortcuts } = useKeyboardShortcuts();
const workflowStore = useWorkflowStore();

const state = reactive({
  enableFitView: props.initialNodes.length < 8,
  enableOrganizeFlow: props.enableOrganizeFlow,
  enableSetViewport: true,
  isInitializing: true,
});

const workflowLoaderSyncConfirmCardRef = ref(null);
const workflowStorageEmptyConfirmCardRef = ref(null);

const AGENT_DEPENDENCY_RESOURCE_TYPES_TO_PROMPT = [
  ResourceConstant.Type.LOADER.value,
  ResourceConstant.Type.STORAGE.value,
];

const initializeNodes = async () => {
  // Wait for node dimensions ready
  await delay(1000);
  await handleNodesInitialized({
    enableFitView: state.enableFitView,
    enableOrganizeFlow: state.enableOrganizeFlow,
    enableSetViewport: state.enableSetViewport,
  });
  if (!props.isDraftUpToDate) {
    props.onDraftUpdate();
  }
  // For better visual experience
  await delay(1000);
  state.isInitializing = false;
  state.enableSetViewport = false;
};

const updateSelectedNode = async (node) => {
  updateUndoStack();
  const updated = NodeFactory.create(node);
  updateStagingNode(updated);

  switch (updated.type) {
    case StateConstant.Type.CHOICE.value: {
      const choices = selectedNode.value.data.stateDefinition.choices;
      choices.map((choiceItem) => {
        const currentNextState = choiceItem.isDefault ? selectedNode.value.data.stateDefinition.defaultChoice : choiceItem.stateDefinition.next;
        const updatedChoiceItem = updated.data.stateDefinition.choices.find(c => c.id === choiceItem.id);
        if (!updatedChoiceItem) return;
        const updatedNextState = choiceItem.isDefault ? updated.data.stateDefinition.defaultChoice : updatedChoiceItem.stateDefinition.next;
        if (currentNextState === updatedNextState) return;
        const nextNodeId = updatedNextState
          ? nodes.value.find(node => node.data.stateDefinition?.name === updatedNextState).id
          : findRouteEndNode(node.id)?.id;
        reconnectToNextNode({
          edgeId: choiceItem.id,
          nodeId: updated.id,
          nextNodeId,
          sourceHandle: choiceItem.sourceHandle,
        });
      });
      break;
    }
    case StateConstant.PseudoType.START.value: {
      const currentStartAt = selectedNode.value.data.startAt;
      const updatedStartAt = updated.data.startAt;
      if (currentStartAt === updatedStartAt) break;
      reconnectToNextNode({
        updatedNode: updated,
        nodeId: updated.id,
        nextNodeId: nodes.value.find(node => node.data.stateDefinition?.name === updatedStartAt)?.id,
      });
      break;
    }
    case StateConstant.PseudoType.END.value:
    case StateConstant.Type.SUCCEED.value:
    case StateConstant.Type.FAIL.value: {
      break;
    }
    default: {
      const currentNextState = selectedNode.value.data.stateDefinition.next;
      const updatedNextState = updated.data.stateDefinition.next;
      const updatedEnd = updated.data.stateDefinition.end;
      if (currentNextState === updatedNextState) break;
      const nextNodeId = updatedEnd
        ? (findRouteEndNode(node.id)?.id || nodes.value.find(n => n.type === StateConstant.PseudoType.END.value && n.parentNode === updated.parentNode).id)
        : nodes.value.find(node => node.data.stateDefinition?.name === updatedNextState).id;
      reconnectToNextNode({
        nodeId: updated.id,
        nextNodeId,
      });
      break;
    }
  }

  const currentCatches = selectedNode.value.data.stateDefinition?.errorHandling?.catches || [];
  const updatedCatches = updated.data.stateDefinition?.errorHandling?.catches || [];

  const { added, removed, changed } = arrUtils.diffObjectByKey(
    currentCatches,
    updatedCatches,
    {
      isChanged: (a, b) => a.next !== b.next,
    },
  );

  reconnectToFallbackNode({
    nodeId: updated.id,
    added,
    removed,
    changed: changed.map(c => ({ id: c.id, next: c.to.next })),
  });

  selectedNode.value = updated;
  await organizeFlow();
  updateWorkflowChain();
  updateDefinitionFromNodes();
};

const restoreWorkflow = () => {
  state.isInitializing = true;
  state.enableOrganizeFlow = true;
  state.enableSetViewport = true;
  const flow = new Flow();
  flow.build({
    startAt: props.workflow.definition.startAt,
    states: props.workflow.definition.states,
    inputSchema: props.workflow.inputSchema,
    outputSchema: props.workflow.outputSchema,
    stateMemoryInputSelector: props.workflow.stateMemoryInputSelector,
    useExternalMemoryInput: props.workflow.useExternalMemoryInput,
  });
  updateFlow({
    updatedNodes: flow.nodes,
    updatedEdges: flow.edges,
  });
  closeConfigForm();
  resetUndoRedoStacks();
  initializeNodes();
};

const extractComparableNodeProperties = ({ data, computedPosition, id, sourcePosition, targetPosition }) => {
  // Only compare the x and y values of the computedPosition
  const { x, y } = computedPosition;
  return { data, computedPosition: { x, y }, id, sourcePosition, targetPosition };
};

const comparableNodes = computed(() => nodes.value.map(extractComparableNodeProperties));

const isFormVisible = computed(() => selectedNodeForm.value && editorMode.value === WorkflowConstant.EditorMode.DESIGN.value);

const notSyncedLoaders = computed(() => Object.values(workflowStore.dependencyResourcesCreatedByWorkflowDefinition).filter(r => r.resourceType === ResourceConstant.Type.LOADER.value));

const hasEmptyStorages = computed(() => Object.values(workflowStore.dependencyResourcesCreatedByWorkflowDefinition).filter(r => r.resourceType === ResourceConstant.Type.STORAGE.value));

const updateDefinitionFromAsl = useDebounceFn((asl) => {
  updateUndoStack();
  const parsedAsl = jsonUtils.safeParse(asl);
  if (!parsedAsl) return;
  state.enableOrganizeFlow = true;
  state.enableFitView = false;
  state.enableSetViewport = false;
  const updatedDefinition = WorkflowDefinition.createFromAsl(parsedAsl);
  const flow = new Flow();
  flow.build({
    startAt: updatedDefinition.startAt,
    states: updatedDefinition.states,
    inputSchema: props.workflow.inputSchema,
    outputSchema: props.workflow.outputSchema,
    stateMemoryInputSelector: props.workflow.stateMemoryInputSelector,
    useExternalMemoryInput: props.workflow.useExternalMemoryInput,
  });
  updateFlow({
    updatedNodes: flow.nodes,
    updatedEdges: flow.edges,
  });
  updateWorkflowChain();
  definition.value = updatedDefinition;
  organizeFlow();
}, 1000);

const handleRedo = () => {
  redo();
  updateNodesCollapseStatus();
};

const handleUndo = () => {
  undo();
  updateNodesCollapseStatus();
};

const clearAllDependenciesResourcesCreatedByWorkflowDefinition = () => {
  const resources = Object.values(workflowStore.dependencyResourcesCreatedByWorkflowDefinition);
  const hasResourcesToPrompt = resources.some(r => AGENT_DEPENDENCY_RESOURCE_TYPES_TO_PROMPT.includes(r.resourceType));
  if (hasResourcesToPrompt) return;
  workflowStore.clearDependencyResourcesCreatedByWorkflowDefinition();
};

onMounted(() => {
  registerKeyboardShortcuts([
    {
      bindings: KeyboardConstant.Bindings.UNDO.value,
      enabled: computed(() => !isUndoDisabled.value && !isFormVisible.value),
      callback: handleUndo,
    },
    {
      bindings: KeyboardConstant.Bindings.REDO.value,
      enabled: computed(() => !isRedoDisabled.value && !isFormVisible.value),
      callback: handleRedo,
    },
  ]);
  if (notSyncedLoaders.value.length > 0) {
    workflowLoaderSyncConfirmCardRef.value.open();
  }
  if (hasEmptyStorages.value.length > 0) {
    workflowStorageEmptyConfirmCardRef.value.open();
  }
});
</script>

<template>
  <AppDataComparer
    v-if="comparableNodes.length > 0"
    :key="props.draftUpdateTime"
    v-model="comparableNodes"
    :on-compare="(isMatch) => {
      if (isMatch) return;
      props.onDraftUpdate();
    }"
  />
  <v-sheet
    class="w-100 d-flex justify-space-between align-center position-absolute px-4 z-index-2"
    color="background"
    :height="60"
  >
    <div class="d-flex align-center ga-2 z-index-2">
      <AppIconButton
        v-if="props.workflow"
        :aria-label="$t('__actionBack')"
        :icon-size="20"
        :on-click="() => router.push(resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, props.workflow.id))"
        :ripple="false"
        :tooltip="$t('__actionBack')"
        icon="mdi-arrow-left"
        variant="text"
      />
      <WorkflowNameButton
        v-if="props.workflow"
        :workflow="props.workflow"
        :on-workflow-config-change="props.onWorkflowConfigChange"
      />
    </div>
    <div class="z-index-2">
      <AppButtonToggle
        v-model="editorMode"
        :items="Object.values(WorkflowConstant.EditorMode).map(item => ({ ...item, title: $t(item.i18nTitle) }))"
      />
    </div>
    <div class="d-flex align-center justify-space-between ga-2 z-index-2">
      <WorkflowFindJsonPathValueDialog>
        <template #activator="{ onOpen }">
          <AppIconButton
            :icon-size="16"
            :ripple="false"
            :tooltip="$t('__actionFindJsonPathValue')"
            icon="mdi-text-search-variant"
            variant="text"
            @click="onOpen"
          />
        </template>
      </WorkflowFindJsonPathValueDialog>
      <v-sheet
        :height="28"
        :width="140"
        rounded="xl"
        class="auto-save-text d-flex align-center justify-center ga-1 text-caption z-index-1"
      >
        <v-icon
          :icon="props.isDraftUpdating ? 'mdi-cloud-refresh' : 'mdi-cloud-check'"
          color="primary"
        />
        <span class="d-none d-md-inline">
          {{ props.isDraftUpdating ? $t('__titleDraftSaving') : $t('__titleDraftSaved') }}
        </span>
      </v-sheet>
      <WorkflowActionsMenu
        :workflow="props.workflow"
        :on-workflow-update="props.onWorkflowUpdate"
        :on-workflow-restore="restoreWorkflow"
      />
    </div>
  </v-sheet>
  <div class="workflow-wrapper">
    <WorkflowStateMenu
      v-if="props.workflow && editorMode === WorkflowConstant.EditorMode.DESIGN.value"
      :on-drag-start="handleDragStart"
    />
    <WorkflowDefinitionEditor
      v-if="props.workflow && editorMode === WorkflowConstant.EditorMode.CODE.value"
      :on-definition-change="updateDefinitionFromAsl"
      :selected-node="selectedNode"
      :on-close="() => { editorMode = WorkflowConstant.EditorMode.DESIGN.value }"
    />
    <VueFlow
      v-if="props.resources"
      :min-zoom="0.1"
      :max-zoom="4"
      :elements-selectable="isInteractive"
      :nodes-draggable="isInteractive"
      :nodes-connectable="isInteractive"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :delete-key-code="[]"
      @init="() => handleInit({
        initialNodes: props.initialNodes,
        initialEdges: props.initialEdges,
      })"
      @drop="handlePaneDrop"
      @dragover="handlePaneDragOver"
      @pane-click="handlePaneClick"
      @nodes-initialized="initializeNodes"
      @node-click="handleNodeClick"
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
          :resources="props.resources"
        />
      </template>
      <CustomVueFlowBackground />
      <CustomVueFlowControls
        v-model:is-interactive="isInteractive"
        v-model:is-swappable="isSwappable"
        :is-undo-disabled="isUndoDisabled"
        :is-redo-disabled="isRedoDisabled"
        :is-set-swappable-disabled="editorMode === WorkflowConstant.EditorMode.CODE.value"
        :on-undo="handleUndo"
        :on-redo="handleRedo"
        :on-collapse-toggle="setAllNodesCollapse"
        :on-organize="organizeFlow"
        :on-swappable-set="setSwappable"
      />
    </VueFlow>
    <CustomVueFlowLoader :loading="!props.resources || state.isInitializing" />
    <Suspense>
      <component
        :is="selectedNodeForm"
        v-if="isFormVisible"
        :node="selectedNode"
        :on-resources-update="props.onResourcesUpdate"
        :on-state-form-close="closeConfigForm"
        :on-update="updateSelectedNode"
        :on-workflow-input-schema-change="props.onWorkflowInputSchemaChange"
        :on-workflow-output-schema-change="props.onWorkflowOutputSchemaChange"
        :resources="props.resources"
        :used-state-definition-names="nodes.map(node => node.data.stateDefinition?.name)"
        :workflow="props.workflow"
      />
    </Suspense>
  </div>
  <AppDialog
    ref="workflowLoaderSyncConfirmCardRef"
    :on-submit="() => {
      workflowStore.clearDependencyResourcesByType(ResourceConstant.Type.LOADER.value);
      clearAllDependenciesResourcesCreatedByWorkflowDefinition();
    }"
  >
    <template #body="{ onSubmit }">
      <WorkflowLoaderSyncConfirmationCard
        :items="notSyncedLoaders"
        :on-close="onSubmit"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="workflowStorageEmptyConfirmCardRef"
    :on-submit="() => {
      workflowStore.clearDependencyResourcesByType(ResourceConstant.Type.STORAGE.value);
      clearAllDependenciesResourcesCreatedByWorkflowDefinition();
    }"
  >
    <template #body="{ onSubmit }">
      <WorkflowStorageEmptyConfirmationCard
        :items="hasEmptyStorages"
        :on-close="onSubmit"
      />
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
.vue-flow__panel {
  margin: 0 32px;
}
.workflow-wrapper {
  // The editor layout renders no app bar or footer, so the canvas fills the
  // full viewport; the toolbar floats over the top via position-absolute.
  height: 100dvh;
}
.auto-save-text {
  background: rgba(var(--v-theme-backgroundScale2));
  border-radius: 8px;
  padding: 0 8px;
}
</style>
