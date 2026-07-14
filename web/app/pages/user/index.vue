<script setup>
import { IconConstant } from '~/constants';

const server = useServer();
const authStore = useAuthStore();

const { data: user, pending: userPending, error, refresh: userRefresh } = await server.me.get();
</script>

<template>
  <template v-if="userPending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="user">
      <ResourceInfoTitle :title="user.name" />
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__titleSecurity'), value: 'security' },
          { title: $t('__fieldGroup', 2), value: 'groups' },
          { title: $t('__fieldApiKey', 2), value: 'api-keys' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="user"
            edit-path="user/edit"
            :item-label="$t('__fieldUser')"
          >
            <template #prepend-actions>
              <AccountUserChangePasswordButton :resource="user" />
            </template>
            <template #before-delete-actions>
              <AppIconButton
                v-if="authStore.canAccessManagementConsole"
                :aria-label="$t('__actionViewUsageAnalysis')"
                :icon="IconConstant.Base.USAGE"
                variant="text"
                :tooltip="$t('__actionViewUsageAnalysis')"
                :on-click="() => navigateTo(`/usage/users/${user.name}`)"
              />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #security>
          <AccountUserSecurity
            :user="user"
            :on-user-refresh="userRefresh"
          />
        </template>
        <template #groups>
          <AccountUserGroupList />
        </template>
        <template #api-keys>
          <AccountUserApiKeyList />
        </template>
      </AppTabs>
    </template>
    <template v-else-if="error">
      <ResourceErrorCard
        :label="$t('__fieldUser')"
        :status-code="error.data.status"
      />
    </template>
  </template>
</template>
