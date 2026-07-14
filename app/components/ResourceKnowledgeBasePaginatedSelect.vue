<script setup>
import { KnowledgeBaseConstant, ListConstant, ResourceConstant } from '~/constants';
import ResourceKnowledgeBaseForm from './ResourceKnowledgeBaseForm';

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
  disableCondition: {
    type: Object,
    default: null,
  },
  disabledTooltip: {
    type: String,
    default: null,
  },
  hint: {
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
    :field-name="$t('__fieldKnowledgeBase')"
    :instruction="$t('__instructionResourceKnowledgeBase')"
    :module="ResourceConstant.Type.KNOWLEDGE_BASE.module"
    :form-component="ResourceKnowledgeBaseForm"
    :title="$t('__fieldKnowledgeBase', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'knowledge_base_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(KnowledgeBaseConstant.Type, item.type, 'title'), iconPath: item => findField(KnowledgeBaseConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :disable-condition="props.disableCondition"
    :return-object="props.returnObject"
    :required="props.required"
    :disabled-tooltip="props.disabledTooltip"
    :hint="props.hint"
    :not-found-object-id="props.notFoundObjectId"
    @update:model-value="props.onUpdate"
  />
</template>
