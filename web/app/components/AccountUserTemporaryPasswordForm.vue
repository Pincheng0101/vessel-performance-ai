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
    :form-title="$t('__actionResetTemporaryPassword')"
    :icon="AccountConstant.Base.TEMPORARY_PASSWORD.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <p class="pb-6">
        <i18n-t
          keypath="__instructionUserResetTemporaryPassword"
          tag="span"
        >
          <template #user>
            <span class="text-primary font-weight-bold">
              {{ props.resource.name }}
            </span>
          </template>
        </i18n-t>
      </p>
      <AccountUserTemporaryPasswordFormFields
        v-model:form-data="state.formData"
        :hidden-fields="props.resource.status === AccountConstant.UserStatus.FORCE_CHANGE_PASSWORD.value ? [] : ['messageAction']"
      />
    </template>
  </AppForm>
</template>
