<template>
  <v-app>
    <LayoutHeaderChat />
    <v-main class="d-flex align-center">
      <v-container
        fluid
        class="pa-0"
      >
        <slot />
      </v-container>
    </v-main>
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
