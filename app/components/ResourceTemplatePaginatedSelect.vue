<script setup>
import { ListConstant, ResourceConstant } from '~/constants';
import ResourceTemplateForm from './ResourceTemplateForm';

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
    :field-name="$t('__fieldTemplate')"
    :instruction="$t('__instructionResourceTemplate')"
    :module="ResourceConstant.Type.TEMPLATE.module"
    :form-component="ResourceTemplateForm"
    :title="$t('__fieldTemplate', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'template_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.TEMPLATE.value, item.id), target: '_blank' }) },
      { title: $t('__fieldTemplate'), key: 'template', isJinjaCode: true, editorOptions: { minLines: 5, maxLines: 5 } },
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
