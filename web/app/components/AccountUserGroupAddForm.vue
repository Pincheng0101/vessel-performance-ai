<script setup>
/**
 * @import { Group } from '~/models/server/group'
 */

const props = defineProps({
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
   * @type {Group}
   */
  formData: {},
});

if (props.users) {
  state.formData = objUtils.toRaw(props.users);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleAddUserToGroup')"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountUserGroupAddFormFields v-model:form-data="state.formData" />
    </template>
  </AppForm>
</template>
