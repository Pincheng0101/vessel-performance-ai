<script setup>
import { ListConstant, LlmConstant, ResourceConstant } from '~/constants';
import ResourceLlmForm from './ResourceLlmForm';

const props = defineProps({
  fieldName: {
    type: String,
    default: null,
  },
  instruction: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: null,
  },
  allowCreate: {
    type: Boolean,
    default: true,
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
  disableCondition: {
    type: Object,
    default: null,
  },
  hint: {
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
    :allow-create="props.allowCreate"
    :field-name="props.fieldName || $t('__fieldLlm')"
    :instruction="props.instruction || $t('__instructionResourceLlm')"
    :module="ResourceConstant.Type.LLM.module"
    :form-component="ResourceLlmForm"
    :title="props.title || $t('__fieldLlm', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'llm_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', iconPath: item => findField(LlmConstant.Type, item.type, 'iconPath'), value: item => findField(LlmConstant.Type, item.type, 'title') },
      { title: $t('__fieldModel'), key: 'model', value: item => findField(LlmConstant.Model, item.model, 'title') || item.model }, // Fallback for unknown model
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :disable-condition="props.disableCondition"
    :return-object="props.returnObject"
    :required="props.required"
    :hint="props.hint"
    :not-found-object-id="props.notFoundObjectId"
    @update:model-value="props.onUpdate"
  >
    <template
      v-if="$slots.chip"
      #chip="slotProps"
    >
      <slot
        name="chip"
        v-bind="slotProps"
      />
    </template>
    <template
      v-if="$slots.append"
      #append
    >
      <slot name="append" />
    </template>
  </ResourcePaginatedSelect>
</template>
