<script setup>
import { ImagePathConstant } from '~/constants';

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  },
});

const { appName } = useRuntimeConfig().public;
const { resolvePath } = useImagePath();
const customTheme = useCustomTheme();
const { logo } = useDeploymentConfig();

const hasCustomLogo = computed(() => Boolean(logo.light || logo.dark));

const brandmarkImagePath = computed(() => {
  return ImagePathConstant.Logo.BRANDMARK[customTheme.currentTheme.value];
});

const wordmarkImagePath = computed(() => {
  return ImagePathConstant.Logo.WORDMARK[customTheme.currentTheme.value];
});

const brandmarkSrc = computed(() => {
  return brandmarkImagePath.value ? resolvePath(brandmarkImagePath.value) : '';
});

const wordmarkSrc = computed(() => {
  return wordmarkImagePath.value ? resolvePath(wordmarkImagePath.value) : '';
});

const customLogoSrc = computed(() => logo[customTheme.currentTheme.value] || '');

const isReady = ref(false);

onMounted(() => {
  // Avoid VImg polling before DOM/img is stable.
  isReady.value = true;
});
</script>

<template>
  <NuxtLink
    to="/"
    class="d-flex align-center ga-2 cursor-pointer user-select-none"
    :class="{
      'w-100': hasCustomLogo && !props.compact && props.block,
      'px-2': hasCustomLogo,
    }"
  >
    <template v-if="hasCustomLogo">
      <v-img
        v-if="!props.compact && isReady && customLogoSrc"
        :alt="appName"
        :src="customLogoSrc"
        :class="props.block ? 'w-100' : 'flex-grow-0'"
        :transition="false"
        :width="props.block ? undefined : 128"
        eager
      />
    </template>
    <template v-else>
      <v-sheet
        :min-width="40"
        color="transparent"
        class="d-flex align-center justify-center"
      >
        <v-img
          v-if="isReady && brandmarkSrc"
          :alt="appName"
          :src="brandmarkSrc"
          :max-width="24"
          :transition="false"
          eager
        />
      </v-sheet>
      <v-img
        v-if="!props.compact && isReady && wordmarkSrc"
        :alt="appName"
        :src="wordmarkSrc"
        class="flex-grow-0"
        :transition="false"
        :width="128"
        eager
      />
    </template>
  </NuxtLink>
</template>
