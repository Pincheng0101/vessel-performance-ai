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

const snackbarStore = useSnackbarStore();
const server = useServer();

const state = reactive({
  formData: {
    mfaConfiguration: props.resource.mfaConfiguration || AccountConstant.MfaConfiguration.OPTIONAL.value,
    softwareTokenMfaEnabled: !!props.resource.softwareTokenMfaEnabled,
    webAuthnUserVerification: props.resource.webAuthnUserVerification || AccountConstant.WebAuthnUserVerification.PREFERRED.value,
  },
});

const submit = async () => {
  const { error } = await server.authentication.adminSetUserPoolMfaConfig({
    mfaConfiguration: state.formData.mfaConfiguration,
    softwareTokenMfaEnabled: state.formData.softwareTokenMfaEnabled,
    webAuthnUserVerification: state.formData.webAuthnUserVerification,
  });
  if (error.value) {
    snackbarStore.setActionFailure('__actionSave');
    return;
  }
  snackbarStore.setActionSuccess('__actionSave');
  await props.onSubmit();
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleMfaPolicy')"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldMfaMode')"
      >
        <AppSelect
          :id="id"
          v-model="state.formData.mfaConfiguration"
          :items="Object.values(AccountConstant.MfaConfiguration).map(opt => ({ ...opt, title: $t(opt.i18nTitle), subtitle: $t(opt.i18nSubtitle) }))"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldEnableTotp')"
        :tooltip="$t('__tooltipTotpEnabled')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.softwareTokenMfaEnabled"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldWebAuthnUserVerification')"
      >
        <AppSelect
          :id="id"
          v-model="state.formData.webAuthnUserVerification"
          :items="Object.values(AccountConstant.WebAuthnUserVerification).map(opt => ({ ...opt, title: $t(opt.i18nTitle), subtitle: $t(opt.i18nSubtitle) }))"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
