<script setup>
import { RetrieverConstant } from '~/constants';

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const queryStrings = defineModel('queryStrings', {
  type: [String, Object],
  default: null,
});

const searchQuery = defineModel('searchQuery', {
  type: [String, Object],
  default: null,
});

const state = reactive({
  querySource: null,
});

const initializeState = () => {
  if (queryStrings.value) {
    state.querySource = RetrieverConstant.KeywordQuerySource.QUERY_STRINGS.value;
    return;
  }
  if (searchQuery.value) {
    state.querySource = RetrieverConstant.KeywordQuerySource.SEARCH_QUERY.value;
    return;
  }
  state.querySource = RetrieverConstant.KeywordQuerySource.QUERY_STRINGS.value;
};

initializeState();

const handleQuerySourceChange = (v) => {
  switch (v) {
    case RetrieverConstant.KeywordQuerySource.QUERY_STRINGS.value:
      searchQuery.value = null;
      break;
    case RetrieverConstant.KeywordQuerySource.SEARCH_QUERY.value:
      queryStrings.value = null;
      searchQuery.value = RetrieverConstant.ActionExecutionParams.RETRIEVER_SEARCH_QUERY;
      break;
  }
  props.onUpdate();
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldQuerySource')"
  >
    <AppSelect
      :id="id"
      v-model="state.querySource"
      :items="Object.values(RetrieverConstant.KeywordQuerySource).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      @update:model-value="handleQuerySourceChange"
    />
  </AppInputGroup>
  <template v-if="state.querySource === RetrieverConstant.KeywordQuerySource.QUERY_STRINGS.value">
    <StateInputGroup
      v-model="queryStrings"
      :label="$t('__fieldKeyword', 2)"
      required
      :on-update="props.onUpdate"
    >
      <template #default="{ id, label }">
        <AppCombobox
          :id="id"
          v-model="queryStrings"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="props.onUpdate"
        />
      </template>
    </StateInputGroup>
  </template>
  <template v-else-if="state.querySource === RetrieverConstant.KeywordQuerySource.SEARCH_QUERY.value">
    <StateInputGroup
      v-model="searchQuery"
      :default-value="RetrieverConstant.ActionExecutionParams.RETRIEVER_SEARCH_QUERY"
      :label="$t('__fieldOpenSearchQuery')"
      :tooltip="$t('__tooltipWorkflowActionOpenSearchQuery')"
      :on-update="props.onUpdate"
      use-json-input
      force-use-json-input
      required
    >
      <template #default="{ id, label }">
        <AppJsonEditor
          :id="id"
          v-model:object="searchQuery"
          enable-json-path-binding-linter
          :rules="(
            $validator
              .defineField(label)
              .json()
              .apply('jsonPathBinding')
              .required()
              .collect()
          )"
          @update:object="props.onUpdate"
        />
      </template>
    </StateInputGroup>
  </template>
</template>
