<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { StructuredLlmNodeData } from '~/models/workflow/state/task/structuredLlm'
 * @import { Resource } from '~/models/server'
 */

/**
 * @type {{ data: StructuredLlmNodeData, resources: Record<string, Resource[]> }}
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

const llms = computed(() => props.resources?.[ResourceConstant.Type.LLM.listKey] || {});

const restoredLlm = computed(() => llms.value[payload.value.llm.llmId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.STRUCTURED_LLM.i18nTitle) })"
    :icon="StateConstant.ActionType.STRUCTURED_LLM.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceLlm
          :llm-resource="restoredLlm"
          :llm-content="payload.llm.content"
          :llm-messages="payload.llm.messages"
        />
        <WorkflowNodeDetailsJsonSchema :json-schema="payload.llm.jsonSchema" />
      </template>
    </template>
  </WorkflowNode>
</template>
