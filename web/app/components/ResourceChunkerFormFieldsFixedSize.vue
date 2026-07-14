<script setup>
import { ChunkerConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const chunkSize = defineModel('chunkSize', {
  type: [String, Number],
  default: null,
});

const chunkOverlap = defineModel('chunkOverlap', {
  type: [String, Number],
  default: null,
});

const separators = defineModel('separators', {
  type: Array,
  default: [],
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('chunkSize')"
    v-slot="{ id }"
    :label="$t('__fieldChunkSize')"
    :tooltip="$t('__tooltipResourceChunkerChunkSize')"
    required
  >
    <AppSlider
      :id="id"
      v-model="chunkSize"
      :min="ChunkerConstant.DefaultParams.CHUNK_SIZE.min"
      :max="ChunkerConstant.DefaultParams.CHUNK_SIZE.max"
      :step="ChunkerConstant.DefaultParams.CHUNK_SIZE.step"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('chunkOverlap')"
    v-slot="{ id, label }"
    :label="$t('__fieldChunkOverlap')"
    :tooltip="$t('__tooltipResourceChunkerChunkOverlap')"
    required
  >
    <AppSlider
      :id="id"
      v-model="chunkOverlap"
      :min="ChunkerConstant.DefaultParams.CHUNK_OVERLAP.min"
      :max="chunkSize - ChunkerConstant.DefaultParams.CHUNK_OVERLAP.step"
      :step="ChunkerConstant.DefaultParams.CHUNK_OVERLAP.step"
      :rules="(
        $validator
          .defineField(label)
          .lte(chunkSize - ChunkerConstant.DefaultParams.CHUNK_OVERLAP.step)
          .collect()
      )"
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
