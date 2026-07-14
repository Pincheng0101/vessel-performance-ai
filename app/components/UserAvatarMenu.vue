<script setup>
import { AccountConstant, LocaleConstant } from '~/constants';

const props = defineProps({
  expanded: {
    type: Boolean,
    default: false,
  },
});

const auth = useAuth();
const authStore = useAuthStore();
const { t, locale } = useI18n();
const { setLocale } = useCustomLocale();
const { isDarkTheme, setTheme } = useCustomTheme();

const state = reactive({
  loadingMap: {},
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const closeMenu = () => {
  model.value = false;
  state.loadingMap = {};
};

const signOut = async (item) => {
  state.loadingMap[item.value] = true;
  await delay(1000);
  auth.signOut();
  closeMenu();
};

const navigateToUserPage = (item) => {
  navigateTo(item?.tab ? `/user?tab=${item.tab}` : '/user');
  closeMenu();
};

const navigateToPrivacy = () => {
  window.open('/privacy', '_blank', 'noopener');
  closeMenu();
};

const changeTheme = (value) => {
  setTheme(value);
  closeMenu();
};

const changeLocale = (value) => {
  setLocale(value);
  closeMenu();
};

const items = computed(() => [
  {
    title: t('__titleAccount'),
    value: 'account',
    icon: AccountConstant.Base.USER.icon,
    loading: state.loadingMap.account,
    callback: navigateToUserPage,
  },
  {
    title: t('__titleTheme'),
    value: 'theme',
    icon: 'mdi-brightness-6',
    children: [
      {
        title: t('__titleThemeLight'),
        value: 'light',
        icon: 'mdi-brightness-7',
        active: !isDarkTheme.value,
        callback: () => changeTheme('light'),
      },
      {
        title: t('__titleThemeDark'),
        value: 'dark',
        icon: 'mdi-brightness-4',
        active: isDarkTheme.value,
        callback: () => changeTheme('dark'),
      },
    ],
  },
  {
    title: t('__titleLanguage'),
    value: 'language',
    icon: 'mdi-web',
    children: Object.values(LocaleConstant.Base).map(item => ({
      title: item.text,
      value: item.value,
      active: locale.value === item.value,
      callback: () => changeLocale(item.value),
    })),
  },
  {
    title: t('__titleHelp'),
    value: 'help',
    icon: 'mdi-help-circle-outline',
    children: [
      {
        title: t('__titlePrivacyPolicy'),
        value: 'privacy',
        appendIcon: 'mdi-open-in-new',
        callback: navigateToPrivacy,
      },
    ],
  },
  {
    title: t('__actionSignOut'),
    value: 'signOut',
    icon: 'mdi-logout',
    loading: state.loadingMap.signOut,
    callback: signOut,
  },
]);
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :location="props.expanded ? 'top' : 'bottom'"
    :transition="false"
    min-width="160"
  >
    <template #activator="{ props: activatorProps }">
      <div
        v-if="props.expanded"
        v-bind="activatorProps"
        class="user-avatar-menu-trigger d-flex align-center ga-2 w-100 px-5 cursor-pointer"
      >
        <UserAvatar
          :name="authStore.parsedToken.username"
          :size="24"
        />
        <span class="text-body-1 text-truncate">
          {{ authStore.parsedToken.username }}
        </span>
      </div>
      <UserAvatar
        v-else
        v-bind="activatorProps"
        :name="authStore.parsedToken.username"
      />
    </template>
    <v-card
      :elevation="1"
      min-width="160"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <template
          v-for="item in items"
          :key="item.title"
        >
          <v-list-item
            v-if="item.children"
            class="text-body-2"
          >
            <template #prepend>
              <v-icon
                :icon="item.icon"
                size="small"
                color="primary"
              />
            </template>
            {{ item.title }}
            <template #append>
              <v-icon
                icon="mdi-chevron-right"
                size="small"
              />
            </template>
            <v-menu
              activator="parent"
              submenu
              open-on-hover
              :offset="-4"
              :transition="false"
              min-width="160"
            >
              <v-card
                :elevation="1"
                min-width="160"
                rounded="lg"
              >
                <v-list
                  density="compact"
                  class="py-0"
                >
                  <v-list-item
                    v-for="child in item.children"
                    :key="child.title"
                    class="text-body-2"
                    :active="child.active"
                    @click="child.callback(child)"
                  >
                    <template
                      v-if="child.icon"
                      #prepend
                    >
                      <v-icon
                        :icon="child.icon"
                        size="small"
                        color="primary"
                      />
                    </template>
                    {{ child.title }}
                    <template
                      v-if="child.appendIcon"
                      #append
                    >
                      <v-icon
                        :icon="child.appendIcon"
                        size="small"
                        color="primary"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>
          </v-list-item>
          <v-list-item
            v-else
            class="text-body-2"
            @click="item.callback(item)"
          >
            <template #prepend>
              <v-icon
                :icon="item.icon"
                size="small"
                color="primary"
              />
            </template>
            <template v-if="item.loading">
              <AppProgressCircular
                :size="20"
                :width="2"
              />
            </template>
            <template v-else>
              {{ item.title }}
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style lang="scss" scoped>
.user-avatar-menu-trigger {
  height: 56px;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }
}
</style>
