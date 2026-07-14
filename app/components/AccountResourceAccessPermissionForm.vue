<script setup>
import { AccountConstant } from '~/constants';

/**
 * @import { ResourcePermission } from '~/models/server/resourcePermission'
 */

/**
 * @type {{ resource: ResourcePermission }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  /**
   * @type {ResourcePermission}
   */
  formData: {
    permission: AccountConstant.AccessType.READ.value,
  },
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldResourceAccessPermission') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountResourceAccessPermissionFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>
