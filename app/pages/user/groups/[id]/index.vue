<script setup>
const route = useRoute();
const server = useServer();
const authStore = useAuthStore();

const { data: group, pending: groupPending, error } = await server.group.get({ groupName: route.params.id });
</script>

<template>
  <template v-if="groupPending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="group">
      <ResourceInfoTitle :title="group.name">
        <template #prepend>
          <AppAddToFavoritesButton
            :item="group"
            :type="group.resourceType"
            persistent
          />
        </template>
      </ResourceInfoTitle>
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__fieldUser', 2), value: 'users' },
          { title: $t('__fieldAgent', 2), value: 'agents', hidden: !authStore.canAccessManagementConsole },
          { title: $t('__fieldWorkflow', 2), value: 'workflows', hidden: !authStore.canAccessManagementConsole },
          { title: $t('__fieldResource', 2), value: 'resources', hidden: !authStore.canAccessManagementConsole },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="group"
            :item-label="$t('__fieldGroup')"
          />
        </template>
        <template #users>
          <AccountGroupUserList />
        </template>
        <template #workflows>
          <AccountWorkflowAccessPermissionList :group-name="group.name" />
        </template>
        <template #resources>
          <AccountResourceAccessPermissionList :group-name="group.name" />
        </template>
        <template #agents>
          <AccountAgentAccessPermissionList :group-name="group.name" />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldGroup')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
