<script setup>
const { isDarkTheme, toggleTheme } = useCustomTheme();
</script>

<template>
  <AppIconButton
    :icon="isDarkTheme ? 'mdi-brightness-4' : 'mdi-brightness-7'"
    size="small"
    icon-size="18"
    variant="text"
    aria-label="Switch Theme"
    :tooltip="isDarkTheme ? $t('__actionSwitchToLightMode') : $t('__actionSwitchToDarkMode')"
    @click="toggleTheme"
  />
</template>
