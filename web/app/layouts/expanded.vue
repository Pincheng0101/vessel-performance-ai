<template>
  <v-app>
    <LayoutHeaderDefault
      :show-drawer="false"
      temporary
    />
    <v-main class="d-flex align-center">
      <v-container
        fluid
        class="pa-0"
      >
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

<style lang="scss" scoped>
:deep(.v-main) {
  height: 100vh;
  height: 100dvh;
}
:deep(.v-application__wrap) {
  min-height: 100%;
}
</style>
