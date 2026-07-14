<script setup>
const { appName } = useAppConfig();

useNetwork();

useSeoMeta({
  title: appName,
});
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator />
    <NuxtPage />
  </NuxtLayout>
</template>
