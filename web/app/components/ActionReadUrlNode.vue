<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { ReadUrlNodeData } from '~/models/workflow/state/task/readUrl'
 */

/**
 * @type {{ data: ReadUrlNodeData }}
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
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.READ_URL.i18nTitle) })"
    :icon="StateConstant.ActionType.READ_URL.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && payload.url">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon="StateConstant.ActionType.READ_URL.icon"
            :text="payload.url"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
