<script setup>
import { RetrieverConstant } from '~/constants';
import { RetrieverFactory } from '~/models/server/retriever';

/**
 * @import { Retriever } from '~/models/server/retriever'
 */

const { disabledRetrieverTypes } = useFeature();

/**
 * @type {{ resource: Retriever }}
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

/**
 * @type {Ref<Retriever>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('retrieverName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.retrieverName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('retrieverType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.retrieverType"
      :disabled="!!props.resource"
      :items="Object.values(RetrieverConstant.Type).map(item => ({
        ...item,
        disabled: disabledRetrieverTypes.map(type => type.value).includes(item.value),
        subtitle: $t(item.i18nSubtitle),
      }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = RetrieverFactory.create({
          retrieverName: formData.retrieverName,
          retrieverType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.retrieverType === RetrieverConstant.Type.EMBEDDING.value">
    <ResourceRetrieverFormFieldsEmbedding
      v-model:embedding-model-id="formData.embeddingModelId"
      v-model:filter-query="formData.filterQuery"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
  <template v-else-if="formData.retrieverType === RetrieverConstant.Type.KEYWORD.value">
    <ResourceRetrieverFormFieldsKeyword
      v-model:filter-query="formData.filterQuery"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
  <template v-else-if="formData.retrieverType === RetrieverConstant.Type.HYBRID_SEARCH.value">
    <ResourceRetrieverFormFieldsHybridSearch
      v-model:embedding-model-id="formData.embeddingModelId"
      v-model:keyword-weight="formData.keywordWeight"
      v-model:embedding-weight="formData.embeddingWeight"
      v-model:normalization-technique="formData.normalizationTechnique"
      v-model:combination-technique="formData.combinationTechnique"
      v-model:filter-query="formData.filterQuery"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
</template>
