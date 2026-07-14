<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { AgentNodeData } from '~/models/workflow/state/task/agent'
 */

/**
 * @type {{ data: AgentNodeData, resources: Record<string, Resource[]> }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  resources: {
    type: Object,
    default: null,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const stateDefinition = computed(() => props.data.stateDefinition);
const payload = computed(() => stateDefinition.value.parameters.payload);

const agents = computed(() => props.resources?.[ResourceConstant.Type.AGENT.listKey] || {});
const llms = computed(() => props.resources?.[ResourceConstant.Type.LLM.listKey] || {});

const restoredAgent = computed(() => agents.value[payload.value.agentId]);
const restoredLlm = computed(() => llms.value[payload.value.llmId]);
const restoredStructuredLlm = computed(() => llms.value[payload.value.structuredLlmId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.AGENT.i18nTitle) })"
    :icon="StateConstant.ActionType.AGENT.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <template v-if="restoredAgent || payload.agentId">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="StateConstant.ActionType.AGENT.icon"
              :text="restoredAgent?.name || payload.agentId"
            />
          </WorkflowNodeDetailsGroup>
        </template>
        <template v-if="restoredLlm || payload.llmId">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              icon="mdi-brain"
              :text="restoredLlm?.name || payload.llmId"
            />
          </WorkflowNodeDetailsGroup>
        </template>
        <template v-if="restoredStructuredLlm || payload.structuredLlmId">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              icon="mdi-code-json"
              :text="restoredStructuredLlm?.name || payload.structuredLlmId"
            />
          </WorkflowNodeDetailsGroup>
        </template>
      </template>
    </template>
  </WorkflowNode>
</template>
