<script setup>
import { CookieConstant } from '~/constants';

const props = defineProps({
  text: {
    type: String,
    default: null,
  },
});

const cognito = useCognito();
const route = useRoute();
const { localLocale } = useCustomLocale();

const loading = ref(false);

const signIn = async () => {
  loading.value = true;
  const state = window.btoa(JSON.stringify({ redirect: route.query.redirect || '/' }));
  const nonce = await strUtils.generateNonce();
  const codeVerifier = await strUtils.generateNonce();

  sessionStorage.setItem(CookieConstant.Auth.NONCE, nonce);
  sessionStorage.setItem(CookieConstant.Auth.STATE, state);
  sessionStorage.setItem(CookieConstant.Auth.CODE_VERIFIER, codeVerifier);

  cognito.redirectToSignIn({
    formData: {
      codeChallenge: strUtils.toBase64Url(await strUtils.toSha256(codeVerifier)),
      lang: localLocale.value,
      nonce,
      state,
    },
  });
};
</script>

<template>
  <AppButton
    variant="flat"
    :text="props.text || $t('__actionSignIn')"
    :loading="loading"
    :on-click="signIn"
  />
</template>
