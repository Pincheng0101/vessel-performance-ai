<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { TextNodeData } from '~/models/workflow/state/task/text'
 */

/**
 * @type {{ data: TextNodeData }}
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
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.TEXT.i18nTitle) })"
    :icon="StateConstant.ActionType.TEXT.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && payload.template">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :text="payload.template"
            :icon="StateConstant.ActionType.TEXT.icon"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
