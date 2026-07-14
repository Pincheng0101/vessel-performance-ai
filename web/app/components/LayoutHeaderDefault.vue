<script setup>
import { AccountConstant, IconConstant } from '~/constants';

const isDev = import.meta.env.DEV;

const { awsAccountEnv, isFirstPartyEnv } = useRuntimeConfig().public;
const authStore = useAuthStore();
const route = useRoute();
const { canAccessWorkflowTemplate } = useWorkflowTemplate();

const getTopLevelSegment = path => String(path ?? '').split('/').filter(Boolean)[0] ?? '';
const isNavigationItemActive = itemValue => getTopLevelSegment(route.path) === getTopLevelSegment(itemValue);
</script>

<template>
  <LayoutHeader :show-drawer="authStore.canAccessManagementConsole">
    <template #navigation-drawer>
      <v-list
        class="mt-8 pa-0 pr-4"
        density="compact"
        nav
      >
        <div class="pl-5 text-overline opacity-70 text-capitalize">
          {{ $t('__titleCreate') }}
        </div>
        <template
          v-for="(item) in [
            {
              title: $t('__titleAgent', 2),
              value: '/agents',
              icon: IconConstant.Base.AGENT,
            },
            {
              title: $t('__titleWorkflow', 2),
              value: '/workflows',
              icon: IconConstant.Base.WORKFLOW,
            },
            {
              title: $t('__titleWorkflowTemplate', 2),
              value: '/workflow-templates',
              icon: IconConstant.Base.WORKFLOW_TEMPLATE,
              hidden: !canAccessWorkflowTemplate,
            },
            {
              title: $t('__titleResource', 2),
              value: '/resources',
              icon: IconConstant.Base.RESOURCE,
            },
          ].filter(item => !item.hidden)"
          :key="item.title"
        >
          <v-list-item
            :active="isNavigationItemActive(item.value)"
            :prepend-icon="item.icon"
            :to="item.value"
            color="primary"
            base-color="primary"
            class="px-5"
          >
            <template #title>
              <span class="text-body-2">{{ item.title }}</span>
            </template>
          </v-list-item>
        </template>
        <template v-if="authStore.parsedToken.isAdmin">
          <div class="pl-5 text-overline opacity-70 text-capitalize">
            {{ $t('__titleManagement') }}
          </div>
          <template
            v-for="(item) in [
              {
                title: $t(AccountConstant.Base.ADMIN_MANAGED_GROUP.i18nTitle, 2),
                value: '/groups',
                icon: AccountConstant.Base.ADMIN_MANAGED_GROUP.icon,
              },
              {
                title: $t(AccountConstant.Base.ADMIN_MANAGED_USER.i18nTitle, 2),
                value: '/users',
                icon: AccountConstant.Base.ADMIN_MANAGED_USER.icon,
              },
              {
                title: $t(AccountConstant.Base.ADMIN_AUTHENTICATION.i18nTitle),
                value: '/authentication',
                icon: AccountConstant.Base.ADMIN_AUTHENTICATION.icon,
              },
              {
                title: $t(AccountConstant.Base.APPLICATION_API_KEY.i18nTitle, 2),
                value: '/application-api-keys',
                icon: AccountConstant.Base.APPLICATION_API_KEY.icon,
              },
              {
                title: $t('__titleUsage'),
                value: '/usage',
                icon: IconConstant.Base.USAGE,
              },
            ]"
            :key="item.title"
          >
            <v-list-item
              :active="isNavigationItemActive(item.value)"
              :prepend-icon="item.icon"
              :to="item.value"
              color="primary"
              base-color="primary"
              class="px-5"
            >
              <template #title>
                <span class="text-body-2">{{ item.title }}</span>
              </template>
            </v-list-item>
          </template>
        </template>
        <template v-if="isFirstPartyEnv">
          <div class="pl-5 text-overline opacity-70 text-capitalize">
            {{ $t('__titleExplore') }}
          </div>
          <template
            v-for="(item) in [
              {
                title: $t('__titleDemo'),
                value: '/demo',
                icon: IconConstant.Base.DEMO,
              },
            ].filter(item => !item.hidden)"
            :key="item.title"
          >
            <v-list-item
              :active="isNavigationItemActive(item.value)"
              :prepend-icon="item.icon"
              :to="item.value"
              color="primary"
              base-color="primary"
              class="px-5"
            >
              <template #title>
                <span class="text-body-2">{{ item.title }}</span>
              </template>
            </v-list-item>
          </template>
          <template v-if="awsAccountEnv === 'dev' || isDev">
            <div class="pl-5 text-overline opacity-70 text-capitalize">
              {{ $t('__titleExperiments') }}
            </div>
            <template
              v-for="(item) in [
                {
                  title: $t('__titlePlayground'),
                  value: '/playground',
                  icon: IconConstant.Base.PLAYGROUND,
                },
              ].filter(item => !item.hidden)"
              :key="item.title"
            >
              <v-list-item
                :active="isNavigationItemActive(item.value)"
                :prepend-icon="item.icon"
                :to="item.value"
                color="primary"
                base-color="primary"
                class="px-5"
              >
                <template #title>
                  <span class="text-body-2">{{ item.title }}</span>
                </template>
              </v-list-item>
            </template>
          </template>
        </template>
      </v-list>
    </template>
  </LayoutHeader>
</template>

<style lang="scss" scoped>
// Match the avatar menu's `size="small"` icons (1.25em at the 14px base = 17.5px).
:deep(.v-list-item__prepend > .v-icon) {
  font-size: 17.5px;
}
</style>
