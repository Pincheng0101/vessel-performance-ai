<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { McpNodeData } from '~/models/workflow/state/task/mcp'
 */

/**
 * @type {{ data: McpNodeData }}
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
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.MCP.i18nTitle) })"
    :icon-path="StateConstant.ActionType.MCP.iconPath"
    :icon-path-mask-color="StateConstant.ActionType.MCP.iconPathMaskColor"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && payload.toolName">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon-path="StateConstant.ActionType.MCP.iconPath"
            icon-path-mask-color="primary"
            :text="payload.toolName"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
