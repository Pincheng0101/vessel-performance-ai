<script setup>
import { ListConstant, ResourceConstant, RetrieverConstant } from '~/constants';
import ResourceRetrieverForm from './ResourceRetrieverForm';

const props = defineProps({
  returnObject: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  notFoundObjectId: {
    type: String,
    default: null,
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
  multipleSelect: {
    type: Boolean,
    default: false,
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
    :field-name="$t('__fieldRetriever', props.multipleSelect ? 2 : 1)"
    :instruction="$t('__instructionResourceRetriever')"
    :module="ResourceConstant.Type.RETRIEVER.module"
    :form-component="ResourceRetrieverForm"
    :title="$t('__fieldRetriever', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'retriever_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(RetrieverConstant.Type, item.type, 'title'), iconPath: item => findField(RetrieverConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :return-object="props.returnObject"
    :required="props.required"
    :hint="props.hint"
    :multiple-select="props.multipleSelect"
    :not-found-object-id="props.notFoundObjectId"
    @update:model-value="props.onUpdate"
  />
</template>
