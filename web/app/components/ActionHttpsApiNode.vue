<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { HttpsApiNodeData } from '~/models/workflow/state/task/httpsApi'
 */

/**
 * @type {{ data: HttpsApiNodeData }}
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
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.HTTPS_API.i18nTitle) })"
    :icon="StateConstant.ActionType.HTTPS_API.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && payload.method && payload.url">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon="StateConstant.ActionType.HTTPS_API.icon"
            :text="`${payload.method} ${payload.url}`"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
