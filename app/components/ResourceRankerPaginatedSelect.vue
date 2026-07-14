<script setup>
import { ListConstant, RankerConstant, ResourceConstant } from '~/constants';
import ResourceRankerForm from './ResourceRankerForm';

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
    :field-name="$t('__fieldRanker')"
    :instruction="$t('__instructionResourceRanker')"
    :module="ResourceConstant.Type.RANKER.module"
    :form-component="ResourceRankerForm"
    :title="$t('__fieldRanker', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'ranker_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(RankerConstant.Type, item.type, 'title'), iconPath: item => findField(RankerConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :return-object="props.returnObject"
    :required="props.required"
    @update:model-value="props.onUpdate"
  />
</template>
