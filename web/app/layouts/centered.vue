<template>
  <v-app>
    <LayoutHeaderDefault
      :show-drawer="false"
      temporary
    />
    <v-main class="d-flex justify-center align-center">
      <slot />
    </v-main>
    <LayoutSnackbar />
    <LayoutFooter app />
  </v-app>
</template>
