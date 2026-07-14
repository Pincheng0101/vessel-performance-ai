<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { StartWorkflowExecutionNodeData } from '~/models/workflow/state/task/startWorkflowExecution'
 */

/**
 * @type {{ data: StartWorkflowExecutionNodeData, resources: Record<string, Resource[]> }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  resources: {
    type: Object,
    default: null,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const stateDefinition = computed(() => props.data.stateDefinition);
const payload = computed(() => stateDefinition.value.parameters.payload);

const workflows = computed(() => props.resources?.[ResourceConstant.Type.WORKFLOW.listKey] || {});

const restoredWorkflow = computed(() => workflows.value[payload.value.workflowId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.START_WORKFLOW_EXECUTION.i18nTitle) })"
    :icon="StateConstant.ActionType.START_WORKFLOW_EXECUTION.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceWorkflow :workflow-resource="restoredWorkflow" />
      </template>
    </template>
  </WorkflowNode>
</template>
