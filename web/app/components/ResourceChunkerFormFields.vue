<script setup>
import { ChunkerConstant } from '~/constants';
import { ChunkerFactory } from '~/models/server/chunker';

/**
 * @import { Chunker } from '~/models/server/chunker'
 */

/**
 * @type {{ resource: Chunker }}
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
 * @type {Ref<Chunker>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('chunkerName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.chunkerName"
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
    v-if="!props.hiddenFields.includes('chunkerType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.chunkerType"
      :disabled="!!props.resource"
      :items="Object.values(ChunkerConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = ChunkerFactory.create({
          chunkerName: formData.chunkerName,
          chunkerType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.chunkerType === ChunkerConstant.Type.FIXED_SIZE.value">
    <ResourceChunkerFormFieldsFixedSize
      v-model:chunk-size="formData.chunkSize"
      v-model:chunk-overlap="formData.chunkOverlap"
      v-model:separators="formData.separators"
      :hidden-fields="props.hiddenFields"
    />
  </template>
  <template v-else-if="formData.chunkerType === ChunkerConstant.Type.CONSECUTIVE.value">
    <ResourceChunkerFormFieldsConsecutive
      v-model:embedding-model-id="formData.embeddingModelId"
      v-model:min-chunk-size="formData.minChunkSize"
      v-model:max-chunk-size="formData.maxChunkSize"
      v-model:separators="formData.separators"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
  <template v-else-if="formData.chunkerType === ChunkerConstant.Type.CUMULATIVE.value">
    <ResourceChunkerFormFieldsCumulative
      v-model:embedding-model-id="formData.embeddingModelId"
      v-model:min-chunk-size="formData.minChunkSize"
      v-model:max-chunk-size="formData.maxChunkSize"
      v-model:separators="formData.separators"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
  <template v-else-if="formData.chunkerType === ChunkerConstant.Type.MINIMAL_PARTITION.value">
    <ResourceChunkerFormFieldsMinimalPartition
      v-model:embedding-model-id="formData.embeddingModelId"
      v-model:min-chunk-size="formData.minChunkSize"
      v-model:max-chunk-size="formData.maxChunkSize"
      v-model:chunk-overlap="formData.chunkOverlap"
      v-model:separators="formData.separators"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
</template>
