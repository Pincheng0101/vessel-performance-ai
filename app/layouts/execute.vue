<template>
  <v-app>
    <LayoutHeaderExecute />
    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>
    <AppFabStack>
      <AppScrollToTopFab />
    </AppFabStack>
    <LayoutSnackbar />
    <LayoutFooter app />
  </v-app>
</template>
