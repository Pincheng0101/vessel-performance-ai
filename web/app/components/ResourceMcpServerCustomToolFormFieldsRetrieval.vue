<script setup>
/**
 * Fields for the MCP custom tool of type `retrieval`.
 * Mirrors the agent retrieval tool: a single knowledge base, the retrievers to run
 * (by id), optional data fields, and an optional ranker (by id).
 */
const knowledgeBaseId = defineModel('knowledgeBaseId', {
  type: String,
  default: null,
});

const retrieverIds = defineModel('retrieverIds', {
  type: Array,
  default: () => [],
});

const dataFields = defineModel('dataFields', {
  type: Array,
  default: () => [],
});

const rankerId = defineModel('rankerId', {
  type: String,
  default: null,
});
</script>

<template>
  <ResourceKnowledgeBasePaginatedSelect
    v-model="knowledgeBaseId"
    :return-object="false"
    required
  />
  <ResourceRetrieverPaginatedSelect
    v-model="retrieverIds"
    :return-object="false"
    multiple-select
    required
  />
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldDataField', 2)"
    :tooltip="$t('__tooltipAgentRetrievalDataFields')"
  >
    <AppCombobox
      :id="id"
      v-model="dataFields"
    />
  </AppInputGroup>
  <ResourceRankerPaginatedSelect
    v-model="rankerId"
    :return-object="false"
    clearable
  />
</template>
