<script setup>
import { AccountConstant } from '~/constants';
import ResourceGroupForm from './ResourceGroupForm.vue';

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
  resource: {
    type: Object,
    default: null,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  tooltip: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: [String, Object, Array],
  default: null,
});

/**
 * Groups are not in ResourceConstant.Type, so ResourcePaginatedSelect's
 * restoreItems() returns early. Pre-seed display objects for edit mode
 * so chips are visible before the user interacts with the selector.
 */
const restoredObjects = ref(
  props.multipleSelect && Array.isArray(model.value) && model.value.length
    ? model.value.map(g => ({ id: g, name: g }))
    : null,
);
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    v-model:restored-objects="restoredObjects"
    :field-name="$t(props.label ?? '__fieldGroup', props.multipleSelect ? 2 : 1)"
    :instruction="$t('__instructionResourceGroup')"
    :module="AccountConstant.Base.ADMIN_MANAGED_GROUP.module"
    :form-component="ResourceGroupForm"
    :title="$t('__fieldGroup', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `/groups/${item.id}`, target: '_blank' }) },
      { title: $t('__fieldDescription'), key: 'description' },
      { title: $t('__fieldRoleArn'), key: 'roleArn' },
      { title: $t('__fieldPrecedence'), key: 'precedence' },
    ]"
    :return-object="props.multipleSelect ? false : props.returnObject"
    :required="props.required"
    :multiple-select="props.multipleSelect"
    :tooltip="props.tooltip"
    @update:model-value="props.onUpdate"
  />
</template>
