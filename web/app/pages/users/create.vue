<script setup>
const snackbarStore = useSnackbarStore();
const server = useServer();

const createResource = async (resource) => {
  const { data, error } = await server.user.adminCreate(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(`/users/${data.value.id}`);
};
</script>

<template>
  <ResourceUserForm
    :hidden-fields="['enabled']"
    :on-submit="createResource"
    :on-discard="() => navigateTo('/users')"
  />
</template>
