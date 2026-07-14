<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { StartNodeData } from '~/models/workflow/state/start'
 */

/**
 * @type {{ data: StartNodeData }}
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
      hide-left-handle
    />
  </template>
  <template v-else>
    <WorkflowNode
      :title="$t(StateConstant.PseudoType.START.i18nTitle)"
      :icon="StateConstant.PseudoType.START.icon"
      :is-state-definition-valid="props.data.isFormGroupValid"
      :readonly="props.readonly"
      hide-left-handle
      icon-background="primary"
    >
      <template #body>
        <template v-if="!props.readonly">
          <WorkflowNodeDetailsJsonSchema :json-schema="props.data.inputSchema" />
          <template v-if="props.data.useExternalMemoryInput">
            <WorkflowNodeDetailsGroup>
              <WorkflowNodeDetails
                icon="mdi-upload-box"
                :text="$t('__workflowUseExternalMemory')"
              />
            </WorkflowNodeDetailsGroup>
          </template>
        </template>
      </template>
    </WorkflowNode>
  </template>
</template>
