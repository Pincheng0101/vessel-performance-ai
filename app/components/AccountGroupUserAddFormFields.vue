<script setup>
import { AccountConstant } from '~/constants';

const PER_PAGE_OPTIONS = [10, 20, 50];

const props = defineProps({
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

/**
 * @type {Ref<{ userNames: string[] }>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

if (!Array.isArray(formData.value?.userNames)) {
  formData.value.userNames = [];
}
</script>

<template>
  <AccountUserPaginatedSelect
    v-model="formData.userNames"
    :return-object="false"
    multiple-select
    :not-found-object-id="props.notFoundResource?.type === AccountConstant.Base.ADMIN_MANAGED_USER.module ? props.notFoundResource.id : null"
    required
    :array-length-lte="AccountConstant.MAX_USERS_PER_BATCH"
    :per-page-options="PER_PAGE_OPTIONS"
    :max-selected-items="AccountConstant.MAX_USERS_PER_BATCH"
    :disabled-tooltip="$t('__tooltipUserAddLimitReached', { maxItems: AccountConstant.MAX_USERS_PER_BATCH })"
  />
</template>
