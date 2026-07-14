<script setup>
import { IconConstant } from '~/constants';

/**
 * @import { TaskNodeData } from '~/models/workflow/state/task'
 */

/**
 * @type {{ data: TaskNodeData }}
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
    :title="props.data.stateDefinition.parameters.payload.actionType"
    :icon="IconConstant.Base.EXPERIMENTAL"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
    </template>
  </WorkflowNode>
</template>
