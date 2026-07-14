<script setup>
import { ResourceConstant, VariableConstant } from '~/constants';
import ResourceVariableForm from './ResourceVariableForm';

const props = defineProps({
  returnObject: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: false,
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
    :field-name="$t('__fieldVariable')"
    :instruction="$t('__instructionResourceVariable')"
    :module="ResourceConstant.Type.VARIABLE.module"
    :form-component="ResourceVariableForm"
    :title="$t('__fieldVariable', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'variable_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(VariableConstant.Type, item.type, 'title'), iconPath: item => findField(VariableConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldValue'), key: 'value', isJsonCode: true, editorOptions: { maxLines: 5, minLines: 5 } },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :return-object="props.returnObject"
    :required="props.required"
    :disable-condition="props.disableCondition"
    :disabled-tooltip="props.disabledTooltip"
    :hint="props.hint"
    @update:model-value="props.onUpdate"
  />
</template>
