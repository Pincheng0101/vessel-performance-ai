<template>
  <v-app>
    <!-- Rendered header-less: the app bar and footer are suppressed so the
    editor canvas fills the viewport and its own controls float on top. The
    LayoutHeaderDefault still mounts (with hide-app-bar) purely so theme/locale
    initialisation, which lives in LayoutHeader's setup, keeps running. -->
    <LayoutHeaderDefault
      :show-drawer="false"
      temporary
      hide-app-bar
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
      <LangForgeAssistantFab />
    </AppFabStack>
    <LayoutSnackbar />
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
