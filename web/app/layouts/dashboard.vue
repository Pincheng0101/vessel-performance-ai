<!-- Public demo dashboard shell: own minimal app bar (brand + chat button + notification bell +
     theme toggle) over a full-width canvas. Theme/locale init used to live in LayoutHeader's
     setup (mounted in every layout); with the app stripped to this single layout, it runs here
     directly. DashboardChatButton / DashboardNotificationBell are this dashboard's own — they
     live here (not a tab component) so they stay visible across every tab. -->
<script setup>
const isCopilotOpen = ref(false);

const { initTheme } = useCustomTheme();
const { initLocale } = useCustomLocale();
initTheme();
onMounted(() => {
  initLocale();
});
</script>

<template>
  <v-app>
    <v-app-bar
      :elevation="0"
      color="background"
    >
      <div class="d-flex align-center w-100 px-6">
        <span class="text-subtitle-1 font-weight-bold">
          陽明海運 | 船隊節能與維修決策智慧平台
        </span>
        <v-spacer />
        <DashboardChatButton
          v-model="isCopilotOpen"
          class="mr-2"
        />
        <DashboardNotificationBell />
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
