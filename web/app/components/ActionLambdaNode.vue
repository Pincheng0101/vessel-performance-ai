<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { LambdaNodeData } from '~/models/workflow/state/task/lambda'
 */

/**
 * @type {{ data: LambdaNodeData }}
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
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.LAMBDA.i18nTitle) })"
    :icon="StateConstant.ActionType.LAMBDA.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && (payload.lambdaFunctionName || payload.lambdaFunctionId)">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon="StateConstant.ActionType.LAMBDA.icon"
            :text="payload.lambdaFunctionName || payload.lambdaFunctionId"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
