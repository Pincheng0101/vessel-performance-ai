<script setup>
import { BreadcrumbsConstant } from '~/constants';

const props = defineProps({
  showDrawer: {
    type: Boolean,
    default: true,
  },
  temporary: {
    type: Boolean,
    default: false,
  },
  // Suppress the app bar entirely (breadcrumbs, logo) so a full-screen
  // page can float its own controls over the content. Theme/locale init in
  // this component's setup still runs, so it stays the single init owner.
  hideAppBar: {
    type: Boolean,
    default: false,
  },
});

const auth = useAuth();
const authStore = useAuthStore();
const display = useDisplay();
const { initTheme } = useCustomTheme();
const { initLocale } = useCustomLocale();

const state = reactive({
  isDrawerVisible: props.showDrawer,
});

// Theme and locale are initialised here because LayoutHeader is mounted in
// every layout. The avatar menu (which now hosts the theme/language controls)
// is only rendered when signed in, so it cannot own initialisation.
initTheme();
onMounted(() => {
  initLocale();
});

const isHeaderLogoVisible = computed(() => {
  return !props.showDrawer || !state.isDrawerVisible || props.temporary || !display.lgAndUp.value;
});

const toggleDrawer = () => {
  state.isDrawerVisible = !state.isDrawerVisible;
};
</script>

<template>
  <v-navigation-drawer
    v-if="auth.isSignedIn.value && props.showDrawer"
    v-model="state.isDrawerVisible"
    :temporary="props.temporary"
    :width="240"
    mobile-breakpoint="lg"
    color="background"
  >
    <div class="px-3 pt-6">
      <LayoutLogo block />
    </div>
    <slot name="navigation-drawer" />
    <template #append>
      <v-divider />
      <UserAvatarMenu expanded />
    </template>
  </v-navigation-drawer>
  <v-app-bar
    v-if="!props.hideAppBar"
    :elevation="0"
    color="background"
  >
    <div class="d-flex align-center px-2 ga-2 w-100">
      <template v-if="auth.isSignedIn.value && props.showDrawer">
        <AppIconButton
          icon="mdi-menu"
          size="small"
          variant="text"
          @click="toggleDrawer"
        />
      </template>
      <template v-if="isHeaderLogoVisible">
        <LayoutLogo :compact="auth.isSignedIn.value" />
      </template>
      <v-sheet
        v-if="auth.isSignedIn.value"
        color="transparent"
        class="breadcrumbs-wrapper"
      >
        <LayoutBreadcrumbs :path-translation-map="BreadcrumbsConstant.PathTranslationMap" />
      </v-sheet>
      <v-sheet
        width="100%"
        color="transparent"
        class="d-flex align-center justify-end ga-1"
      >
        <template v-if="!auth.isSignedIn.value">
          <LayoutLocaleSwitch />
          <LayoutThemeSwitch />
        </template>
        <!-- Non-managers never get the management-console drawer, so on their
        drawer-less pages (e.g. /user) the avatar menu falls back to the app bar
        to keep sign-out and preferences reachable. Managers always have a
        sidebar on their main pages, so focused drawer-less pages (e.g. the
        workflow editor) intentionally show no avatar here. -->
        <template v-if="auth.isSignedIn.value && !props.showDrawer && !authStore.canAccessManagementConsole">
          <UserAvatarMenu />
        </template>
      </v-sheet>
    </div>
  </v-app-bar>
</template>

<style lang="scss" scoped>
.breadcrumbs-wrapper {
  // 100% - drawer icon width - padding - buttons width - padding - logo width - padding
  max-width: v-bind('`calc(100% - 40px - 8px - 40px * 3 - 8px ${isHeaderLogoVisible ? "- 40px - 8px" : ""})`');
}
.v-list-item {
  border-radius: 0 28px 28px 0 !important;
  padding-right: 0 !important;
}
:deep(.v-list-item-title) {
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 20px;
}
</style>
