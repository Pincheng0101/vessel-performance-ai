<script setup>
const snackbarStore = useSnackbarStore();
const server = useServer();

const route = useRoute();

const { data, pending, error } = await server.group.adminGet({ groupName: route.params.id });

const updateResource = async (resource) => {
  const { error } = await server.group.adminUpdate(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(`/groups/${data.value.name}`);
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <ResourceGroupForm
        :resource="data"
        :on-submit="updateResource"
        :on-discard="() => navigateTo(`/groups/${data.name}`)"
      />
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
