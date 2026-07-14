<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { PassNodeData } from '~/models/workflow/state/task/pass'
 */

/**
 * @type {{ data: PassNodeData }}
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
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.PASS.i18nTitle) })"
    :icon="StateConstant.ActionType.PASS.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
    </template>
  </WorkflowNode>
</template>
