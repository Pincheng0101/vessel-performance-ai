<!-- Public demo dashboard shell: own minimal app bar (brand + chat button + theme toggle) over
     a full-width canvas. LayoutHeaderDefault is mounted hidden ONLY so the app's single
     theme/locale init (which lives in its setup) runs — no langforge nav / assistant fab.
     DashboardChatButton is this dashboard's own (unrelated) chat launcher, not the langforge
     one — it lives here (not a tab component) so it stays visible across every tab. -->
<script setup>
const isCopilotOpen = ref(false);
</script>

<template>
  <v-app>
    <LayoutHeaderDefault
      :show-drawer="false"
      temporary
      hide-app-bar
    />
    <v-app-bar
      :elevation="0"
      color="background"
    >
      <div class="d-flex align-center w-100 px-6 ga-2">
        <span class="text-subtitle-1 font-weight-bold">
          陽明海運 | 船隊節能與維修決策智慧平台
        </span>
        <v-spacer />
        <DashboardChatButton v-model="isCopilotOpen" />
        <LayoutThemeSwitch />
      </div>
    </v-app-bar>
    <v-main>
      <v-container
        fluid
        class="pa-4 pa-md-6"
      >
        <slot />
      </v-container>
    </v-main>
    <DashboardCopilotChatPanel v-model="isCopilotOpen" />
    <LayoutSnackbar />
  </v-app>
</template>
