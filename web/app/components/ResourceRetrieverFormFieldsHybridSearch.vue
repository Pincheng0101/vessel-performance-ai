<script setup>
import { ResourceConstant, RetrieverConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const embeddingModelId = defineModel('embeddingModelId', {
  type: String,
  default: null,
});

const keywordWeight = defineModel('keywordWeight', {
  type: Number,
  default: RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.default,
});

const embeddingWeight = defineModel('embeddingWeight', {
  type: Number,
  default: RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.default,
});

const normalizationTechnique = defineModel('normalizationTechnique', {
  type: String,
  default: RetrieverConstant.HybridSearchParams.NORMALIZATION_TECHNIQUE.default,
});

const combinationTechnique = defineModel('combinationTechnique', {
  type: String,
  default: RetrieverConstant.HybridSearchParams.COMBINATION_TECHNIQUE.default,
});

const filterQuery = defineModel('filterQuery', {
  type: [String, Object, Array],
  default: null,
});
</script>

<template>
  <ResourceEmbeddingModelPaginatedSelect
    v-if="!props.hiddenFields.includes('embeddingModelId')"
    v-model="embeddingModelId"
    :return-object="false"
    :tooltip="$t('__tooltipResourceRetrieverEmbeddingModel')"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.EMBEDDING_MODEL.module ? props.notFoundResource.id : null"
    clearable
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('keywordWeight')"
    v-slot="{ id, label }"
    :label="$t('__fieldRetrieverHybridSearchKeywordWeight')"
    :tooltip="$t('__tooltipResourceRetrieverKeywordWeight')"
  >
    <AppSlider
      :id="id"
      v-model="keywordWeight"
      :min="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.min"
      :max="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.max"
      :step="RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.step"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .gte(RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.min)
          .lte(RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.max)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('embeddingWeight')"
    v-slot="{ id, label }"
    :label="$t('__fieldRetrieverHybridSearchEmbeddingWeight')"
    :tooltip="$t('__tooltipResourceRetrieverEmbeddingWeight')"
  >
    <AppSlider
      :id="id"
      v-model="embeddingWeight"
      :min="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.min"
      :max="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.max"
      :step="RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.step"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .gte(RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.min)
          .lte(RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.max)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('normalizationTechnique')"
        v-slot="{ id, label }"
        :label="$t('__fieldRetrieverHybridSearchNormalizationTechnique')"
        :tooltip="$t('__tooltipResourceRetrieverNormalizationTechnique')"
      >
        <AppSelect
          :id="id"
          v-model="normalizationTechnique"
          :items="Object.values(RetrieverConstant.HybridSearchNormalizationTechnique).map(item => ({
            ...item,
            title: $t(item.i18nTitle),
            subtitle: $t(item.i18nSubtitle),
          }))"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('combinationTechnique')"
        v-slot="{ id, label }"
        :label="$t('__fieldRetrieverHybridSearchCombinationTechnique')"
        :tooltip="$t('__tooltipResourceRetrieverCombinationTechnique')"
      >
        <AppSelect
          :id="id"
          v-model="combinationTechnique"
          :items="Object.values(RetrieverConstant.HybridSearchCombinationTechnique).map(item => ({
            ...item,
            title: $t(item.i18nTitle),
            subtitle: $t(item.i18nSubtitle),
          }))"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('filterQuery')"
        v-slot="{ id, label }"
        :label="$t('__fieldFilterQuery')"
        :tooltip="$t('__tooltipWorkflowActionFilterQuery')"
      >
        <AppJsonEditor
          :id="id"
          v-model:object="filterQuery"
          enable-json-path-binding-linter
          :rules="(
            $validator
              .defineField(label)
              .json()
              .jsonSchema(RetrieverConstant.ActionExecutionParams.RETRIEVER_FILTER_QUERY.jsonSchema)
              .apply('jsonPathBinding')
              .collect()
          )"
          @blur="props.onUpdate"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
