<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { MapNodeData } from '~/models/workflow/state/map'
 */

/**
 * @type {{ data: MapNodeData }}
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
    :title="$t(StateConstant.Type.MAP.i18nTitle)"
    :icon="StateConstant.Type.MAP.icon"
    :icon-background="StateConstant.Type.MAP.iconColor"
    :is-state-definition-valid="!!stateDefinition.itemProcessor.startAt && props.data.isFormGroupValid"
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
