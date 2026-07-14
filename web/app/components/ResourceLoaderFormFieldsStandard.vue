<script setup>
import { KnowledgeBaseConstant, ListConstant, ResourceConstant, RetrieverConstant } from '~/constants';

/**
 * @import { Loader } from '~/models/server/loader'
 */

/**
 * @type {{ resource: Loader }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const sources = defineModel('sources', {
  type: Array,
  default: [],
});

const knowledgeBaseId = defineModel('knowledgeBaseId', {
  type: String,
  default: null,
});

const retrieverIds = defineModel('retrieverIds', {
  type: Array,
  default: null,
});

const cron = defineModel('cron', {
  type: String,
  default: null,
});

/**
 * @type {Ref<LoaderErrorResponse>}
 */
const errors = defineModel('errors', {
  type: Object,
  default: {},
});

const state = reactive({
  retrievers: [],
});

if (props.resource) {
  sources.value = props.resource.sources;
}

const isAllRetrieversKeywordType = computed(() => {
  return state.retrievers?.length > 0
    && state.retrievers.every(
      retriever => retriever.type === RetrieverConstant.Type.KEYWORD.value,
    );
});

const hiddenFieldsForSourceTable = computed(() => [
  ...(isAllRetrieversKeywordType.value ? ['retrieverTemplate'] : []),
]);
</script>

<template>
  <!-- Only show knowledge bases unused or used by the current loader -->
  <ResourceKnowledgeBasePaginatedSelect
    v-if="!props.hiddenFields.includes('knowledgeBaseId')"
    v-model="knowledgeBaseId"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.KNOWLEDGE_BASE.module ? props.notFoundResource.id : null"
    :filters="[
      { field: 'knowledge_base_type', operator: '=', value: KnowledgeBaseConstant.Type.VECTOR_STORE.value },
    ]"
    :disable-condition="{
      logic: ListConstant.FilterLogic.AND,
      conditions: [
        { field: 'loaderId', operator: '!=', value: null },
        { field: 'loaderId', operator: '!=', value: props.resource?.loaderId },
      ],
    }"
    :disabled-tooltip="$t('__tooltipKnowledgeBaseUsedByAnotherLoader')"
    :hint="$t('__instructionSupportedKnowledgeBaseTypes', { types: KnowledgeBaseConstant.Type.VECTOR_STORE.title })"
    required
  />
  <ResourceRetrieverPaginatedSelect
    v-if="!props.hiddenFields.includes('retrieverIds')"
    v-model="retrieverIds"
    v-model:restored-objects="state.retrievers"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.RETRIEVER.module ? props.notFoundResource.id : null"
    :filters="[
      { field: 'retriever_type', operator: '=', value: RetrieverConstant.Type.EMBEDDING.value },
      { field: 'retriever_type', operator: '=', value: RetrieverConstant.Type.KEYWORD.value },
      { field: 'retriever_type', operator: '=', value: RetrieverConstant.Type.HYBRID_SEARCH.value },
    ]"
    :hint="$t('__instructionSupportedRetrieverTypes', {
      types: [
        RetrieverConstant.Type.EMBEDDING.title,
        RetrieverConstant.Type.KEYWORD.title,
        RetrieverConstant.Type.HYBRID_SEARCH.title,
      ].join(', '),
    })"
    multiple-select
    required
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('sources')"
    v-slot="{ label }"
    :label="$t('__fieldSource', 2)"
    required
  >
    <ResourceLoaderFormFieldsStandardSourceTable
      v-model="sources"
      :aria-label="label"
      :hidden-fields="hiddenFieldsForSourceTable"
      :not-found-resource="props.notFoundResource"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('cron')"
        v-slot="{ id }"
        :label="$t('__fieldSyncJob')"
        :tooltip="$t('__tooltipResourceLoaderSyncJob')"
      >
        <AppCronInput
          :id="id"
          v-model="cron"
          :error-message="errors.cron"
          @update:model-value="() => { errors.cron = null }"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
