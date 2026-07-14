<script setup>
import { ChunkerConstant, EmbeddingModelConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const embeddingModelId = defineModel('embeddingModelId', {
  type: String,
  default: null,
});

const minChunkSize = defineModel('minChunkSize', {
  type: Number,
  default: null,
});

const maxChunkSize = defineModel('maxChunkSize', {
  type: Number,
  default: null,
});

const separators = defineModel('separators', {
  type: Array,
  default: [],
});
</script>

<template>
  <ResourceEmbeddingModelPaginatedSelect
    v-if="!props.hiddenFields.includes('embeddingModelId')"
    v-model="embeddingModelId"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.EMBEDDING_MODEL.module ? props.notFoundResource.id : null"
    :filters="[
      { field: 'embedding_model_type', operator: '=', value: EmbeddingModelConstant.Type.BEDROCK_COHERE.value },
    ]"
    :hint="$t('__instructionSupportedEmbeddingModelTypes', {
      types: [
        EmbeddingModelConstant.Type.BEDROCK_COHERE.title,
      ].join(', '),
    })"
    required
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('minAndMaxChunkSize')"
    v-slot="{ id }"
    :label="$t('__fieldMinAndMaxChunkSize')"
    :tooltip="$t('__tooltipResourceChunkerMinAndMaxChunkSize')"
    required
  >
    <AppRangeSlider
      :id="id"
      v-model:min-value="minChunkSize"
      v-model:max-value="maxChunkSize"
      :min="ChunkerConstant.DefaultParams.MIN_CHUNK_SIZE.min"
      :max="ChunkerConstant.DefaultParams.MIN_CHUNK_SIZE.max"
      :step="ChunkerConstant.DefaultParams.MIN_CHUNK_SIZE.step"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('separators')"
    v-slot="{ id, label }"
    :label="$t('__fieldSeparator', 2)"
    :tooltip="$t('__tooltipResourceChunkerSeparators')"
    required
  >
    <AppCombobox
      :id="id"
      v-model="separators"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
</template>
