<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { RetrieverNodeData } from '~/models/workflow/state/task/retriever'
 */

/**
 * @type {{ data: RetrieverNodeData, resources: Record<string, Resource[]> }}
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

const knowledgeBases = computed(() => props.resources?.[ResourceConstant.Type.KNOWLEDGE_BASE.listKey] || {});
const retrievers = computed(() => props.resources?.[ResourceConstant.Type.RETRIEVER.listKey] || {});
const templates = computed(() => props.resources?.[ResourceConstant.Type.TEMPLATE.listKey] || {});

const restoredKnowledgeBase = computed(() => knowledgeBases.value[payload.value.retriever.knowledgeBaseId]);
const restoredRetriever = computed(() => retrievers.value[payload.value.retriever.retrieverId]);
const restoredTemplate = computed(() => templates.value[payload.value.retriever?.queryTemplate?.templateId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.RETRIEVER.i18nTitle) })"
    :icon="StateConstant.ActionType.RETRIEVER.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceKnowledgeBase :knowledge-base-resource="restoredKnowledgeBase" />
        <WorkflowNodeDetailsResourceRetriever :retriever-resource="restoredRetriever" />
        <WorkflowNodeDetailsQueryTemplate
          :template-resource="restoredTemplate"
          :template-string="payload.retriever.queryTemplate?.template"
        />
        <WorkflowNodeDetailsQueryString
          :icon="ResourceConstant.Type.TEMPLATE.icon"
          :query-string="payload.retriever.queryString"
        />
      </template>
    </template>
  </WorkflowNode>
</template>
