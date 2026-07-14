<script setup>
import { AccountConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const route = useRoute();
const server = useServer();

const state = reactive({
  refreshResourcePermissionList: 0,
});

const { data: group, pending: groupPending, error } = await server.group.adminGet({ groupName: route.params.id });

const handleDelete = async ({ groupName }) => {
  const { error } = await server.group.adminDestroy({ groupName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo('/groups', { replace: true });
};
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
          { title: $t('__fieldAgentAccess'), value: 'agent-permissions', hidden: group.name === AccountConstant.Group.ADMIN.value },
          { title: $t('__fieldWorkflowAccess'), value: 'workflow-permissions', hidden: group.name === AccountConstant.Group.ADMIN.value },
          { title: $t('__fieldResourceCreation'), value: 'create-resource-permissions', hidden: group.name === AccountConstant.Group.ADMIN.value },
          { title: $t('__fieldResourceAccess'), value: 'resource-permissions', hidden: group.name === AccountConstant.Group.ADMIN.value },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="group"
            :edit-path="`/groups/${group.name}/edit`"
            :item-label="$t('__fieldGroup')"
            :on-delete="handleDelete"
          />
        </template>
        <template #users>
          <AccountGroupUserList is-admin />
        </template>
        <template #workflow-permissions>
          <AccountWorkflowAccessPermissionList
            :group-name="group.name"
            :on-create="() => {
              state.refreshResourcePermissionList += 1;
            }"
            is-admin
          />
        </template>
        <template #create-resource-permissions>
          <AccountResourceCreatePermissionList :group-name="group.name" />
        </template>
        <template #resource-permissions>
          <AccountResourceAccessPermissionList
            :key="state.refreshResourcePermissionList"
            :group-name="group.name"
            is-admin
          />
        </template>
        <template #agent-permissions>
          <AccountAgentAccessPermissionList
            :key="state.refreshResourcePermissionList"
            :group-name="group.name"
            is-admin
          />
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
