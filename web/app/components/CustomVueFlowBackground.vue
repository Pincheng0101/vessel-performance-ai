<script setup>
import { Background } from '@vue-flow/background';

const customTheme = useCustomTheme();
const patternColor = computed(() => customTheme.themeColors.value.vueFlowBackgroundPattern);
</script>

<template>
  <v-sheet
    color="transparent"
    height="100%"
    width="100%"
  >
    <Background
      :size="2"
      :gap="20"
      :pattern-color="patternColor"
    >
      <slot />
    </Background>
  </v-sheet>
</template>
