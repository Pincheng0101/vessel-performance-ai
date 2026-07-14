<script setup>
import QRCode from 'qrcode';

const props = defineProps({
  onSubmit: {
    type: Function,
    default: () => {},
  },
  configured: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const snackbarStore = useSnackbarStore();
const server = useServer();

const state = reactive({
  isStarting: false,
  isVerifying: false,
  inputMode: 'qr',
  secretCode: null,
  qrDataUrl: null,
  userCode: '',
});

const start = async () => {
  state.isStarting = true;
  state.inputMode = 'qr';
  const { data, error } = await server.me.startTotpSetup();
  if (error.value) {
    state.isStarting = false;
    snackbarStore.setActionFailure('__actionSetUpTotp');
    return;
  }
  state.secretCode = data.value.secret_code;
  state.qrDataUrl = await QRCode.toDataURL(data.value.qr_otpauth_url, { width: 200 });
  state.isStarting = false;
};

const verify = async () => {
  state.isVerifying = true;
  const { error } = await server.me.verifyTotpSetup({ userCode: state.userCode });
  state.isVerifying = false;
  if (error.value) {
    state.userCode = '';
    snackbarStore.setFailure(t('__messageTotpCodeMismatch'));
    return false;
  }
  snackbarStore.setActionSuccess('__messageTotpSetupSuccess');
  await props.onSubmit();
  return true;
};

const reset = () => {
  state.isStarting = false;
  state.isVerifying = false;
  state.inputMode = 'qr';
  state.secretCode = null;
  state.qrDataUrl = null;
  state.userCode = '';
};
</script>

<template>
  <AppDialog
    :on-cancel="reset"
    :width="500"
  >
    <template #activator="{ onOpen }">
      <AppButton
        :text="props.configured ? $t('__actionResetTotp') : $t('__actionSetUpTotp')"
        :color="props.configured ? 'actionButton' : 'primary'"
        :on-click="() => { start(); onOpen(); }"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <AppForm
        :form-title="props.configured ? $t('__actionResetTotp') : $t('__actionSetUpTotp')"
        :data="state"
        :on-submit="async () => { if (await verify()) onSubmit(); }"
        :on-discard="onCancel"
      >
        <template #body>
          <template v-if="state.isStarting">
            <AppProgressCircular />
          </template>
          <template v-else-if="state.qrDataUrl">
            <div class="d-flex flex-column ga-2 mb-4">
              <template v-if="state.inputMode === 'qr'">
                <h3 class="text-subtitle-1 font-weight-bold">
                  {{ $t('__titleTotpStepScanQr') }}
                </h3>
                <p class="text-body-2 text-medium-emphasis">
                  {{ $t('__instructionTotpScanQr') }}
                </p>
                <div class="d-flex justify-center my-2">
                  <img
                    :src="state.qrDataUrl"
                    :alt="$t('__titleTotpStepScanQr')"
                    width="200"
                    height="200"
                  >
                </div>
                <div class="d-flex justify-center">
                  <AppButton
                    variant="text"
                    color="primary"
                    :text="$t('__actionCantScanQr')"
                    :on-click="() => { state.inputMode = 'manual'; }"
                  />
                </div>
              </template>
              <template v-else>
                <h3 class="text-subtitle-1 font-weight-bold">
                  {{ $t('__titleTotpStepCopyKey') }}
                </h3>
                <p class="text-body-2 text-medium-emphasis">
                  {{ $t('__instructionTotpCopyKey') }}
                </p>
                <div class="secret-display bg-backgroundScale1 rounded pa-3 text-center text-body-2">
                  {{ state.secretCode }}
                </div>
                <AppCopyable :text="state.secretCode">
                  <template #default="{ copy, tooltip }">
                    <AppButton
                      block
                      :text="tooltip"
                      color="actionButton"
                      :on-click="copy"
                    />
                  </template>
                </AppCopyable>
                <div class="d-flex justify-center">
                  <AppButton
                    variant="text"
                    color="primary"
                    :text="$t('__actionWantScanQr')"
                    :on-click="() => { state.inputMode = 'qr'; }"
                  />
                </div>
              </template>
            </div>
            <v-divider class="mb-4" />
            <div class="d-flex flex-column ga-2">
              <h3 class="text-subtitle-1 font-weight-bold">
                {{ $t('__titleTotpStepCode') }}
              </h3>
              <p class="text-body-2 text-medium-emphasis">
                {{ $t('__instructionTotpEnterCode') }}
              </p>
              <v-otp-input
                v-model="state.userCode"
                :disabled="state.isVerifying"
              />
            </div>
          </template>
        </template>
      </AppForm>
    </template>
  </AppDialog>
</template>

<style scoped>
.secret-display {
  font-family: monospace;
  word-break: break-all;
}
</style>
