<script setup>
const route = useRoute();

useHead(() => ({
  htmlAttrs: {
    class: route.meta?.pageScrollingDisabledOnMdUp ? 'page-scrolling-disabled-on-md-up' : null,
  },
}));
</script>

<template>
  <v-app>
    <LayoutHeaderDefault />
    <v-main class="d-flex">
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>
    <AppFabStack>
      <LangForgeAssistantFab />
    </AppFabStack>
    <LayoutSnackbar />
    <LayoutFooter app />
  </v-app>
</template>

<style scoped>
:global(html.page-scrolling-disabled-on-md-up) {
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

@media (max-width: 959px) {
  :global(html.page-scrolling-disabled-on-md-up) {
    overflow: auto;
    scrollbar-width: auto;
    -ms-overflow-style: auto;
  }
}
</style>
