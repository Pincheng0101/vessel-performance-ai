<script setup>
import { IconConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const route = useRoute();
const server = useServer();

const { data: user, pending: userPending, refresh: userRefresh, error } = await server.user.adminGet({ userName: route.params.id });

const handleDelete = async ({ userName }) => {
  const { error } = await server.user.adminDestroy({ userName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo('/users', { replace: true });
};
</script>

<template>
  <template v-if="userPending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="user">
      <ResourceInfoTitle :title="user.name">
        <template #prepend>
          <AppAddToFavoritesButton
            :item="user"
            :type="user.resourceType"
            persistent
          />
        </template>
      </ResourceInfoTitle>
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__fieldGroup', 2), value: 'groups' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="user"
            :edit-path="`/users/${user.name}/edit`"
            :item-label="$t('__fieldUser')"
            :on-delete="handleDelete"
          >
            <template #prepend-actions>
              <AccountUserTemporaryPasswordButton
                :resource="user"
                :on-submit="userRefresh"
              />
              <AccountUserResetMfaButton
                v-if="!user.isFederated"
                :resource="user"
                :on-submit="userRefresh"
              />
              <AccountUserSignOutButton
                :resource="user"
                :on-submit="userRefresh"
              />
            </template>
            <template #before-delete-actions>
              <AppIconButton
                :aria-label="$t('__actionViewUsageAnalysis')"
                :icon="IconConstant.Base.USAGE"
                variant="text"
                :tooltip="$t('__actionViewUsageAnalysis')"
                :on-click="() => navigateTo(`/usage/users/${user.name}`)"
              />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #groups>
          <AccountUserGroupList is-admin />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldUser')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
