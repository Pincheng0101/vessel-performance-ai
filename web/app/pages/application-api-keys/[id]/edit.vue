<script setup>
const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.applicationApiKey.adminGet({
  applicationApiKeyId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.applicationApiKey.adminUpdate(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(`/application-api-keys/${data.value.id}`);
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <AccountApplicationApiKeyForm
        :resource="data"
        :on-submit="updateResource"
        :on-discard="() => navigateTo(`/application-api-keys/${data.id}`)"
      />
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldApplicationApiKey')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
