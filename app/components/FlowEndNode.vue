<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { EndNodeData } from '~/models/workflow/state/end'
 */

/**
 * @type {{ data: EndNodeData }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  parentNodeId: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <template v-if="props.parentNodeId">
    <WorkflowNode
      is-child
      hide-right-handle
    />
  </template>
  <template v-else>
    <WorkflowNode
      :title="$t(StateConstant.PseudoType.END.i18nTitle)"
      :icon="StateConstant.PseudoType.END.icon"
      :is-state-definition-valid="props.data.isFormGroupValid"
      :readonly="props.readonly"
      hide-right-handle
      icon-background="primary"
    >
      <template #body>
        <template v-if="!props.readonly">
          <WorkflowNodeDetailsJsonSchema :json-schema="props.data.outputSchema" />
        </template>
      </template>
    </WorkflowNode>
  </template>
</template>
