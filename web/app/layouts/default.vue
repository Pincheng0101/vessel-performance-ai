<template>
  <v-app>
    <LayoutHeaderDefault />
    <v-main class="d-flex">
      <v-container>
        <slot />
      </v-container>
    </v-main>
    <AppFabStack>
      <AppScrollToTopFab />
      <LangForgeAssistantFab />
    </AppFabStack>
    <LayoutSnackbar />
    <LayoutFooter app />
  </v-app>
</template>
