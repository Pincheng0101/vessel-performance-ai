<script setup>
import { ResourceConstant } from '~/constants';

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
</script>

<template>
  <ResourceEmbeddingModelPaginatedSelect
    v-if="!props.hiddenFields.includes('embeddingModelId')"
    v-model="embeddingModelId"
    :return-object="false"
    :tooltip="$t('__tooltipResourceRankerEmbeddingModel')"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.EMBEDDING_MODEL.module ? props.notFoundResource.id : null"
    clearable
  />
</template>
