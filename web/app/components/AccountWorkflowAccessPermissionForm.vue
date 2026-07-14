<script setup>
import { AccountConstant } from '~/constants';

/**
 * @import { WorkflowPermission } from '~/models/server/workflowPermission'
 */

/**
 * @type {{ workflow: WorkflowPermission }}
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
  notFoundResource: {
    type: Object,
    default: () => {},
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
   * @type {WorkflowPermission}
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
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldWorkflowAccessPermission') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountWorkflowAccessPermissionFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :not-found-resource="props.notFoundResource"
      />
    </template>
  </AppForm>
</template>
