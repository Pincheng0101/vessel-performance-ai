<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { ParallelNodeData } from '~/models/workflow/state/parallel'
 */

/**
 * @type {{ data: ParallelNodeData }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  dimensions: {
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
    :title="$t(StateConstant.Type.PARALLEL.i18nTitle)"
    :icon="StateConstant.Type.PARALLEL.icon"
    :icon-background="StateConstant.Type.PARALLEL.iconColor"
    :is-state-definition-valid="!!stateDefinition.branches.length > 0 && props.data.isFormGroupValid"
    :readonly="props.readonly"
    :width="props.dimensions.width"
    :height="props.dimensions.height"
    is-parent
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
    </template>
  </WorkflowNode>
</template>
