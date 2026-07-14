<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { SucceedNodeData } from '~/models/workflow/state/succeed'
 */

/**
 * @type {{ data: SucceedNodeData }}
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
    :title="$t(StateConstant.Type.SUCCEED.i18nTitle)"
    :icon="StateConstant.Type.SUCCEED.icon"
    :icon-background="StateConstant.Type.SUCCEED.iconColor"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
    </template>
  </WorkflowNode>
</template>
