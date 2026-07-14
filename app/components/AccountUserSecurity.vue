<script setup>
import { AccountConstant } from '~/constants';

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  onUserRefresh: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();
const cognito = useCognito();
const route = useRoute();
const server = useServer();
const snackbarStore = useSnackbarStore();

const passkeysResult = props.user?.isFederated
  ? { data: ref([]), refresh: () => {} }
  : await server.me.listPasskeys();
const { data: passkeys, refresh: passkeysRefresh } = passkeysResult;

// Cognito /passkeys/add returns to redirect_uri with ?result=success (or error)
// appended. Handle it here since passkey registration redirects straight to
// this page (bypassing /auth/callback).
onMounted(() => {
  const passkeyResult = route.query.result;
  if (!passkeyResult) return;
  if (passkeyResult === 'success') {
    snackbarStore.setSuccess(t('__messagePasskeyRegistrationSuccess'));
    passkeysRefresh();
  } else {
    snackbarStore.setFailure(t('__messagePasskeyRegistrationFailed'));
  }
  // Strip the `result` query so a page reload doesn't re-trigger the snackbar.
  const nextQuery = { ...route.query };
  delete nextQuery.result;
  navigateTo({ path: route.path, query: nextQuery }, { replace: true });
});

const passkeyConfigured = computed(() => !!passkeys.value?.length);

const isRegisteringPasskey = ref(false);

const registerPasskey = async () => {
  isRegisteringPasskey.value = true;
  await cognito.redirectToPasskeyRegistration({ redirect: route.fullPath });
};

const handleDeletePasskey = async (credentialId) => {
  const { error: deleteError } = await server.me.deletePasskey({ credentialId });
  if (deleteError.value) return;
  snackbarStore.setSuccess(t('__messagePasskeyDeleted'));
  await passkeysRefresh();
};

const mfaRows = computed(() => [
  {
    id: AccountConstant.MfaType.SOFTWARE_TOKEN_MFA.value,
    name: t(AccountConstant.MfaType.SOFTWARE_TOKEN_MFA.i18nTitle),
    icon: AccountConstant.MfaType.SOFTWARE_TOKEN_MFA.icon,
    configured: (props.user?.mfaSettingList || []).includes(AccountConstant.MfaType.SOFTWARE_TOKEN_MFA.value),
  },
  {
    id: AccountConstant.MfaType.WEB_AUTHN.value,
    name: t(AccountConstant.MfaType.WEB_AUTHN.i18nTitle),
    icon: AccountConstant.MfaType.WEB_AUTHN.icon,
    configured: passkeyConfigured.value,
  },
]);

const mfaHeaders = computed(() => [
  { title: t('__fieldName'), key: 'name', icon: item => item.icon, iconColor: 'primary' },
  { title: t('__fieldEnabled'), key: 'configured', value: item => item.configured ? t('__fieldYes') : t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.configured ? 'success' : null }) },
]);
</script>

<template>
  <AppInfoCard
    v-if="props.user?.isFederated"
    icon="mdi-shield-account-outline"
    :title="$t('__titleFederatedMfa')"
    :instruction="$t('__instructionFederatedMfa')"
    min-height="400"
  />
  <template v-else>
    <AppTable
      :title="$t('__titleMfa')"
      icon="mdi-two-factor-authentication"
      :server-side="false"
      :headers="mfaHeaders"
      :items="mfaRows"
      :enable-search="false"
      :show-pagination="false"
      class="mb-3"
    >
      <template #row-menu="{ item }">
        <template v-if="item.id === AccountConstant.MfaType.SOFTWARE_TOKEN_MFA.value">
          <AccountUserSecurityTotpDialog
            :on-submit="props.onUserRefresh"
            :configured="item.configured"
          />
        </template>
        <template v-else-if="item.id === AccountConstant.MfaType.WEB_AUTHN.value">
          <AppButton
            :text="$t('__actionRegisterPasskey')"
            :color="item.configured ? 'actionButton' : 'primary'"
            :loading="isRegisteringPasskey"
            :on-click="registerPasskey"
          />
        </template>
      </template>
    </AppTable>
    <AccountUserPasskeyList
      v-if="passkeyConfigured"
      :passkeys="passkeys || []"
      :on-delete="handleDeletePasskey"
    />
  </template>
</template>
