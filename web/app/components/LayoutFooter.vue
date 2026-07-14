<script setup>
const auth = useAuth();
const { isDarkTheme } = useCustomTheme();

const props = defineProps({
  app: {
    type: Boolean,
    default: false,
  },
  linkText: {
    type: String,
    default: '',
  },
  linkUrl: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <template v-if="!auth.isSignedIn.value">
    <v-footer
      :app="props.app"
      color="background"
      class="w-100 d-flex align-center text-body-2 px-5 py-2"
    >
      <span>&copy; {{ (new Date()).getFullYear() }} Headquarter.ai</span>
      <NuxtLink
        v-if="props.linkText && props.linkUrl"
        :href="props.linkUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="ms-4"
      >
        {{ props.linkText }}
      </NuxtLink>
    </v-footer>
    <teleport to="body">
      <NuxtLink
        to="/privacy"
        :class="[
          'layout-footer-privacy-link',
          'text-body-2',
          'text-decoration-underline',
          isDarkTheme ? 'text-white' : 'text-black',
        ]"
      >
        {{ $t('__titlePrivacyPolicy') }}
      </NuxtLink>
    </teleport>
  </template>
</template>

<style scoped>
.layout-footer-privacy-link {
  position: fixed;
  right: 16px;
  bottom: 8px;
  z-index: 9999;
}
</style>
