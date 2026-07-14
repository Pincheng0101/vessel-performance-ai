<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { RetrievalNodeData } from '~/models/workflow/state/task/retrieval'
 * @import { Retriever } from '~/models/server/retriever'
 * @import { KnowledgeBase } from '~/models/server/knowledgeBase'
 */

/**
 * @type {{ data: RetrievalNodeData, resources: Record<string, Resource[]> }}
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
const rankers = computed(() => props.resources?.[ResourceConstant.Type.RANKER.listKey] || {});
const templates = computed(() => props.resources?.[ResourceConstant.Type.TEMPLATE.listKey] || {});

const restoredKnowledgeBases = computed(() => jsonPathUtils.isJsonPath(payload.value.retrievers) ? [] : payload.value.retrievers.map(retriever => knowledgeBases.value[retriever.knowledgeBaseId]));
const restoredRetrievers = computed(() => jsonPathUtils.isJsonPath(payload.value.retrievers) ? [] : payload.value.retrievers.map(retriever => retrievers.value[retriever.retrieverId]));
const restoredRetrieverTemplates = computed(() => jsonPathUtils.isJsonPath(payload.value.retrievers) ? [] : payload.value.retrievers.map(retriever => templates.value[retriever.queryTemplate?.templateId]));
const restoredRanker = computed(() => rankers.value[payload.value.ranker.rankerId]);
const restoredRankerTemplate = computed(() => templates.value[payload.value.ranker.queryTemplate?.templateId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.RETRIEVAL.i18nTitle) })"
    :icon="StateConstant.ActionType.RETRIEVAL.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceKnowledgeBase :knowledge-base-resource="restoredKnowledgeBases[0]" />
        <template
          v-for="(_, i) in restoredRetrievers"
          :key="i"
        >
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetailsResourceKnowledgeBase :knowledge-base-resource="restoredKnowledgeBases[i]" />
            <WorkflowNodeDetailsResourceRetriever :retriever-resource="restoredRetrievers[i]" />
            <WorkflowNodeDetailsQueryTemplate
              :template-resource="restoredRetrieverTemplates[i]"
              :template-string="payload.retrievers[i].queryTemplate?.template"
            />
            <WorkflowNodeDetailsQueryString
              :icon="ResourceConstant.Type.TEMPLATE.icon"
              :query-string="payload.retrievers[i].queryString"
            />
          </WorkflowNodeDetailsGroup>
        </template>
        <WorkflowNodeDetailsGroup v-if="restoredRanker">
          <WorkflowNodeDetailsResourceRanker :ranker-resource="restoredRanker" />
          <WorkflowNodeDetailsContentTemplate :content-template="payload.ranker.contentTemplate" />
          <WorkflowNodeDetailsQueryTemplate
            :template-resource="restoredRankerTemplate"
            :template-string="payload.ranker.queryTemplate?.template"
          />
          <WorkflowNodeDetailsQueryString
            :icon="ResourceConstant.Type.TEMPLATE.icon"
            :query-string="payload.ranker.queryString"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
