<script setup>
const snackbarStore = useSnackbarStore();
const server = useServer();

const createResource = async (resource) => {
  const { data, error } = await server.group.adminCreate(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(`/groups/${data.value.name}`);
};
</script>

<template>
  <ResourceGroupForm
    :on-submit="createResource"
    :on-discard="() => navigateTo('/groups')"
  />
</template>
