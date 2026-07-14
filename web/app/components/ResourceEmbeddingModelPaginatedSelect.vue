<script setup>
import { EmbeddingModelConstant, ListConstant, ResourceConstant } from '~/constants';
import ResourceEmbeddingModelForm from './ResourceEmbeddingModelForm';

const props = defineProps({
  returnObject: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  filterLogic: {
    type: String,
    default: ListConstant.FilterLogic.OR,
  },
  filters: {
    type: Array,
    default: () => [],
  },
  hint: {
    type: String,
    default: null,
  },
  tooltip: {
    type: String,
    default: null,
  },
  notFoundObjectId: {
    type: String,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: [String, Object],
  default: null,
});

const restoredObjects = defineModel('restoredObjects', {
  type: [String, Object],
  default: null,
});
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    v-model:restored-objects="restoredObjects"
    :field-name="$t('__fieldEmbeddingModel')"
    :instruction="$t('__instructionResourceEmbeddingModel')"
    :module="ResourceConstant.Type.EMBEDDING_MODEL.module"
    :form-component="ResourceEmbeddingModelForm"
    :title="$t('__fieldEmbeddingModel', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'embedding_model_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(EmbeddingModelConstant.Type, item.type, 'title'), iconPath: item => findField(EmbeddingModelConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :return-object="props.returnObject"
    :required="props.required"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :hint="props.hint"
    :tooltip="props.tooltip"
    :not-found-object-id="props.notFoundObjectId"
    @update:model-value="props.onUpdate"
  />
</template>
