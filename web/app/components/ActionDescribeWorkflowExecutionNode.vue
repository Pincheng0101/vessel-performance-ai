<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { DescribeWorkflowExecutionNodeData } from '~/models/workflow/state/task/describeWorkflowExecution'
 */

/**
 * @type {{ data: DescribeWorkflowExecutionNodeData }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const stateDefinition = computed(() => props.data.stateDefinition);
const payload = computed(() => stateDefinition.value.parameters.payload);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.i18nTitle) })"
    :icon="StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && payload.executionArn">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon="ResourceConstant.Type.WORKFLOW.icon"
            :text="payload.executionArn"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
