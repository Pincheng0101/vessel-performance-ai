<script setup>
const snackbarStore = useSnackbarStore();
const server = useServer();
const route = useRoute();

const { data, pending, error } = await server.user.adminGet({ userName: route.params.id });

const updateResource = async (resource) => {
  const { error } = await server.user.adminUpdate(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(`/users/${data.value.userName}`);
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
        :hidden-fields="['messageAction', 'temporaryPassword']"
        :on-submit="updateResource"
        :on-discard="() => navigateTo(`/users/${data.id}`)"
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
