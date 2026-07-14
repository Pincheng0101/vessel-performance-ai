<script setup>
import { AccountConstant, ListConstant } from '~/constants';
import ResourceUserForm from './ResourceUserForm.vue';

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
  arrayLengthLte: {
    type: Number,
    default: null,
  },
  perPageOptions: {
    type: Array,
    default: () => ListConstant.ItemsPerPageOption.LIST,
  },
  maxSelectedItems: {
    type: Number,
    default: null,
  },
  disabledTooltip: {
    type: String,
    default: '',
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
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    :field-name="$t('__fieldUser')"
    :instruction="$t('__instructionResourceUser')"
    :module="AccountConstant.Base.ADMIN_MANAGED_USER.module"
    :form-component="ResourceUserForm"
    :title="$t('__fieldUser', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `/users/${item.id}`, target: '_blank' }) },
      { title: $t('__fieldEmail'), key: 'email' },
      { title: $t('__fieldRole'), key: 'isAdmin', value: item => item.isAdmin ? $t('__fieldAdmin') : $t('__fieldUser'), isChip: true, chipOptions: item => ({ color: item.isAdmin ? 'primary' : null }) },
      { title: $t('__fieldEnabled'), key: 'enabled', value: item => item.enabled ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.enabled ? 'success' : null }) },
    ]"
    :return-object="props.returnObject"
    :required="props.required"
    :not-found-object-id="props.notFoundObjectId"
    :array-length-lte="props.arrayLengthLte"
    :per-page-options="props.perPageOptions"
    :max-selected-items="props.maxSelectedItems"
    :disabled-tooltip="props.disabledTooltip"
    @update:model-value="props.onUpdate"
  />
</template>
