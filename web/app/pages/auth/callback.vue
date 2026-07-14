<script setup>
import { CookieConstant } from '~/constants';

definePageMeta({
  layout: 'centered',
  middleware: [
    'guest',
  ],
});

const { CODE_VERIFIER, CODE, NONCE, STATE } = CookieConstant.Auth;

const snackbarStore = useSnackbarStore();
const authStore = useAuthStore();
const cognito = useCognito();
const { baseURL } = useRuntimeConfig().app;
const { t } = useI18n();

const searchParams = new URLSearchParams(window.location.search);
const code = searchParams.get(CODE);
const state = searchParams.get(STATE);

const localCodeVerifier = sessionStorage.getItem(CODE_VERIFIER);
const localNonce = sessionStorage.getItem(NONCE);
const localState = sessionStorage.getItem(STATE);

sessionStorage.removeItem(CODE_VERIFIER);
sessionStorage.removeItem(NONCE);
sessionStorage.removeItem(STATE);

const handleCallback = async () => {
  if (!code || !state || !localCodeVerifier || !localState || (state !== localState)) {
    console.warn('Invalid state or code');
    snackbarStore.setFailure(t('__messageSignInFailed'));
    await navigateTo('/', { replace: true });
    return;
  }

  const { data, error } = await cognito.createToken({
    formData: {
      redirectUri: `${window.location.origin}${baseURL}auth/callback`,
      code,
      codeVerifier: localCodeVerifier,
    },
  });

  if (error.value) {
    snackbarStore.setFailure(t('__messageSignInFailed'));
    await navigateTo('/', { replace: true });
    return;
  }

  const { nonce } = jwtUtils.decode(data.value.idToken);

  if (nonce !== localNonce) {
    snackbarStore.setFailure(t('__messageSignInFailed'));
    await navigateTo('/', { replace: true });
    return;
  }

  authStore.setAccessToken(data.value.accessToken);
  authStore.setRefreshToken(data.value.refreshToken);

  const { redirect } = JSON.parse(window.atob(state));
  snackbarStore.setActionSuccess('__actionSignIn');
  await navigateTo(redirect, { replace: true });
};

handleCallback();
</script>

<template>
  <AppProgressCircular />
</template>
