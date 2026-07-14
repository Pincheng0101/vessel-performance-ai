<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { SearchEngineNodeData } from '~/models/workflow/state/task/searchEngine'
 */

/**
 * @type {{ data: SearchEngineNodeData, resources: Record<string, Resource[]> }}
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

const searchEngines = computed(() => props.resources?.[ResourceConstant.Type.SEARCH_ENGINE.listKey] || {});
const templates = computed(() => props.resources?.[ResourceConstant.Type.TEMPLATE.listKey] || {});

const restoredSearchEngine = computed(() => searchEngines.value[payload.value.searchEngine.searchEngineId]);
const restoredTemplate = computed(() => templates.value[payload.value.searchEngine.queryTemplate?.templateId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.SEARCH_ENGINE.i18nTitle) })"
    :icon="StateConstant.ActionType.SEARCH_ENGINE.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceSearchEngine :search-engine-resource="restoredSearchEngine" />
        <WorkflowNodeDetailsQueryTemplate
          :template-resource="restoredTemplate"
          :template-string="payload.searchEngine.queryTemplate?.template"
        />
        <WorkflowNodeDetailsQueryString
          :icon="StateConstant.ActionType.SEARCH_ENGINE.icon"
          :query-string="payload.searchEngine.queryString"
        />
      </template>
    </template>
  </WorkflowNode>
</template>
