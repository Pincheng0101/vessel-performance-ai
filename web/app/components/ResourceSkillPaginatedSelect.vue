<script setup>
import { ListConstant, ResourceConstant } from '~/constants';
import ResourceSkillForm from './ResourceSkillForm';

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
  disabled: {
    type: Boolean,
    default: false,
  },
  disableCondition: {
    type: Object,
    default: () => {},
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
    :field-name="$t('__fieldSkill')"
    :instruction="$t('__instructionResourceSkill')"
    :module="ResourceConstant.Type.SKILL.module"
    :form-component="ResourceSkillForm"
    :title="$t('__fieldSkill', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'skill_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, item.id), target: '_blank' }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldDescription'), key: 'description' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :return-object="props.returnObject"
    :required="props.required"
    :hint="props.hint"
    :disabled="props.disabled"
    :disable-condition="props.disableCondition"
    @update:model-value="props.onUpdate"
  />
</template>
