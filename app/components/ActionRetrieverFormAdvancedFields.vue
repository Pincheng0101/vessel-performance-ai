<script setup>
import { JsonSchemaConstant, RetrieverConstant } from '~/constants';

/**
 * @import { Retriever } from '~/models/server/retriever'
 */

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<Retriever>}
 */
const formData = defineModel('formData', {
  type: [String, Object],
  default: {},
});

const initializeHybridSearchState = () => {
  if (formData.value.retrieverType !== RetrieverConstant.Type.HYBRID_SEARCH.value) return;

  formData.value.keywordWeight = formData.value.keywordWeight ?? RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.default;
  formData.value.embeddingWeight = formData.value.embeddingWeight ?? RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.default;
  formData.value.normalizationTechnique = formData.value.normalizationTechnique ?? RetrieverConstant.HybridSearchParams.NORMALIZATION_TECHNIQUE.default;
  formData.value.combinationTechnique = formData.value.combinationTechnique ?? RetrieverConstant.HybridSearchParams.COMBINATION_TECHNIQUE.default;
};

const initializeState = () => {
  formData.value.filterQuery = (() => {
    // Can be null, undefined or an object
    if (formData.value.filterQuery === null) return null;
    if (formData.value.filterQuery === undefined) return RetrieverConstant.ActionExecutionParams.RETRIEVER_FILTER_QUERY.default;
    return formData.value.filterQuery;
  })();

  formData.value.fieldMappings = (() => {
    // Can be null, undefined or an object
    if (formData.value.fieldMappings === null) return null;
    if (formData.value.fieldMappings === undefined) return RetrieverConstant.ActionExecutionParams.RETRIEVER_FIELD_MAPPINGS;
    return formData.value.fieldMappings;
  })();

  formData.value.limit = formData.value.limit ?? RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.default;

  initializeHybridSearchState();
};

initializeState();

watch(() => formData.value?.retrieverType, () => {
  initializeHybridSearchState();
});
</script>

<template>
  <StateInputGroup
    v-model="formData.filterQuery"
    :default-value="RetrieverConstant.ActionExecutionParams.RETRIEVER_FILTER_QUERY.default"
    :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
    :label="$t('__fieldFilterQuery')"
    :tooltip="$t('__tooltipWorkflowActionFilterQuery')"
    :on-update="props.onUpdate"
    enable-json-input-switch
    use-json-input
    force-use-json-input
  >
    <template #default="{ id, label }">
      <AppJsonEditor
        :id="id"
        v-model:object="formData.filterQuery"
        enable-json-path-binding-linter
        :rules="(
          $validator
            .defineField(label)
            .json()
            .jsonSchema(RetrieverConstant.ActionExecutionParams.RETRIEVER_FILTER_QUERY.jsonSchema)
            .apply('jsonPathBinding')
            .collect()
        )"
        @update:object="props.onUpdate"
      />
    </template>
  </StateInputGroup>
  <StateInputGroup
    v-model="formData.fieldMappings"
    :default-value="RetrieverConstant.ActionExecutionParams.RETRIEVER_FIELD_MAPPINGS"
    :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
    :label="$t('__fieldFieldMapping', 2)"
    :tooltip="$t('__tooltipWorkflowActionFieldMappings')"
    :on-update="props.onUpdate"
    enable-json-input-switch
    use-json-input
    force-use-json-input
  >
    <template #default="{ id, label }">
      <AppJsonEditor
        :id="id"
        v-model:object="formData.fieldMappings"
        enable-json-path-binding-linter
        :rules="(
          $validator
            .defineField(label)
            .json()
            .apply('jsonPathBinding')
            .collect()
        )"
        @update:object="props.onUpdate"
      />
    </template>
  </StateInputGroup>
  <template v-if="formData.retrieverType === RetrieverConstant.Type.HYBRID_SEARCH.value">
    <StateInputGroup
      v-model="formData.keywordSubquery"
      :default-value="null"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
      :label="$t('__fieldRetrieverHybridSearchKeywordSubquery')"
      :tooltip="$t('__tooltipWorkflowActionRetrieverHybridSearchKeywordSubquery')"
      :on-update="props.onUpdate"
      enable-json-input-switch
      use-json-input
      force-use-json-input
    >
      <template #default="{ id, label }">
        <AppJsonEditor
          :id="id"
          v-model:object="formData.keywordSubquery"
          enable-json-path-binding-linter
          :rules="(
            $validator
              .defineField(label)
              .json()
              .apply('jsonPathBinding')
              .collect()
          )"
          @update:object="props.onUpdate"
        />
      </template>
    </StateInputGroup>
    <StateInputGroup
      v-model="formData.keywordWeight"
      :default-value="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.default"
      :label="$t('__fieldRetrieverHybridSearchKeywordWeight')"
      :tooltip="$t('__tooltipResourceRetrieverKeywordWeight')"
      :on-update="props.onUpdate"
    >
      <template #default="{ id, label }">
        <AppSlider
          :id="id"
          v-model="formData.keywordWeight"
          :min="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.min"
          :max="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.max"
          :step="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.step"
          layout="narrow"
          :rules="(
            $validator
              .defineField(label)
              .gte(RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.min)
              .lte(RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.max)
              .collect()
          )"
          @update:model-value="props.onUpdate"
        />
      </template>
    </StateInputGroup>
    <StateInputGroup
      v-model="formData.embeddingWeight"
      :default-value="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.default"
      :label="$t('__fieldRetrieverHybridSearchEmbeddingWeight')"
      :tooltip="$t('__tooltipResourceRetrieverEmbeddingWeight')"
      :on-update="props.onUpdate"
    >
      <template #default="{ id, label }">
        <AppSlider
          :id="id"
          v-model="formData.embeddingWeight"
          :min="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.min"
          :max="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.max"
          :step="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.step"
          layout="narrow"
          :rules="(
            $validator
              .defineField(label)
              .gte(RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.min)
              .lte(RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.max)
              .collect()
          )"
          @update:model-value="props.onUpdate"
        />
      </template>
    </StateInputGroup>
    <StateInputGroup
      v-model="formData.normalizationTechnique"
      :default-value="RetrieverConstant.HybridSearchParams.NORMALIZATION_TECHNIQUE.default"
      :label="$t('__fieldRetrieverHybridSearchNormalizationTechnique')"
      :tooltip="$t('__tooltipResourceRetrieverNormalizationTechnique')"
      :on-update="props.onUpdate"
    >
      <template #default="{ id }">
        <AppSelect
          :id="id"
          v-model="formData.normalizationTechnique"
          :items="Object.values(RetrieverConstant.HybridSearchNormalizationTechnique).map(item => ({
            ...item,
            title: $t(item.i18nTitle),
            subtitle: $t(item.i18nSubtitle),
          }))"
          @update:model-value="props.onUpdate"
        />
      </template>
    </StateInputGroup>
    <StateInputGroup
      v-model="formData.combinationTechnique"
      :default-value="RetrieverConstant.HybridSearchParams.COMBINATION_TECHNIQUE.default"
      :label="$t('__fieldRetrieverHybridSearchCombinationTechnique')"
      :tooltip="$t('__tooltipResourceRetrieverCombinationTechnique')"
      :on-update="props.onUpdate"
    >
      <template #default="{ id }">
        <AppSelect
          :id="id"
          v-model="formData.combinationTechnique"
          :items="Object.values(RetrieverConstant.HybridSearchCombinationTechnique).map(item => ({
            ...item,
            title: $t(item.i18nTitle),
            subtitle: $t(item.i18nSubtitle),
          }))"
          @update:model-value="props.onUpdate"
        />
      </template>
    </StateInputGroup>
  </template>
  <StateInputGroup
    v-model="formData.limit"
    :default-value="RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.default"
    :label="$t('__fieldLimitOfDocuments')"
    :tooltip="$t('__tooltipWorkflowActionLimitOfDocuments')"
    :on-update="props.onUpdate"
  >
    <template #default="{ id, label }">
      <AppTextField
        :id="id"
        v-model.integer="formData.limit"
        type="number"
        :min="RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.min"
        :max="RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.max"
        :step="RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.step"
        :rules="(
          $validator
            .defineField(label)
            .gte(RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.min)
            .lte(RetrieverConstant.ActionExecutionParams.RETRIEVER_LIMIT.max)
            .collect()
        )"
        @update:model-value="props.onUpdate"
      />
    </template>
  </StateInputGroup>
</template>
