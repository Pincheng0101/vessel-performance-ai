<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { RankerNodeData } from '~/models/workflow/state/task/ranker'
 */

/**
 * @type {{ data: RankerNodeData, resources: Record<string, Resource[]> }}
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

const rankers = computed(() => props.resources?.[ResourceConstant.Type.RANKER.listKey] || {});
const templates = computed(() => props.resources?.[ResourceConstant.Type.TEMPLATE.listKey] || {});

const restoredRanker = computed(() => rankers.value[payload.value.ranker.rankerId]);
const restoredTemplate = computed(() => templates.value[payload.value.ranker.queryTemplate?.templateId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.RANKER.i18nTitle) })"
    :icon="StateConstant.ActionType.RANKER.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceRanker :ranker-resource="restoredRanker" />
        <WorkflowNodeDetailsContentTemplate :content-template="payload.ranker.contentTemplate" />
        <WorkflowNodeDetailsQueryTemplate
          :template-resource="restoredTemplate"
          :template-string="payload.ranker.queryTemplate?.template"
        />
        <WorkflowNodeDetailsQueryString
          :icon="ResourceConstant.Type.TEMPLATE.icon"
          :query-string="payload.ranker.queryString"
        />
      </template>
    </template>
  </WorkflowNode>
</template>
