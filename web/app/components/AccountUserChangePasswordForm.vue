<script setup>
import { AccountConstant } from '~/constants';

const props = defineProps({
  resource: {
    type: Object,
    required: true,
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
  formData: {},
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__actionChangePassword')"
    :icon="AccountConstant.Base.CHANGE_PASSWORD.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountUserChangePasswordFormFields v-model:form-data="state.formData" />
    </template>
  </AppForm>
</template>
