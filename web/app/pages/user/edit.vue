<script setup>
const snackbarStore = useSnackbarStore();
const server = useServer();
const authStore = useAuthStore();

const { data, pending, error } = await server.me.get({ userName: authStore.parsedToken.username });

const updateResource = async (resource) => {
  const { error } = await server.me.update(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(`/user`);
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <ResourceUserForm
        :resource="data"
        :hidden-fields="['enabled', 'isAdmin', 'messageAction', 'temporaryPassword']"
        :on-submit="updateResource"
        :on-discard="() => navigateTo(`/user`)"
      />
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
