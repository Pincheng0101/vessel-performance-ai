<script setup>
import { ListConstant, ResourceConstant } from '~/constants';
import ResourceStorageForm from './ResourceStorageForm';

const props = defineProps({
  fieldName: {
    type: String,
    default: null,
  },
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
    :field-name="props.fieldName ?? $t('__fieldStorage')"
    :instruction="$t('__instructionResourceStorage')"
    :module="ResourceConstant.Type.STORAGE.module"
    :form-component="ResourceStorageForm"
    :title="$t('__fieldStorage', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'storage_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.id), target: '_blank' }) },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :return-object="props.returnObject"
    :required="props.required"
    :tooltip="props.tooltip"
    @update:model-value="props.onUpdate"
  />
</template>
