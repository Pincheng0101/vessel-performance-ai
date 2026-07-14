<script setup>
const snackbarStore = useSnackbarStore();
const server = useServer();

const createResource = async (resource) => {
  const { data, error } = await server.applicationApiKey.adminCreate(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(`/application-api-keys/${data.value.id}`);
};
</script>

<template>
  <AccountApplicationApiKeyForm
    :on-submit="createResource"
    :on-discard="() => navigateTo('/application-api-keys')"
  />
</template>
