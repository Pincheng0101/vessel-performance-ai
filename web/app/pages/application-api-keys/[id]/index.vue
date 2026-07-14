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

const handleDelete = async ({ applicationApiKeyId }) => {
  const { error } = await server.applicationApiKey.adminDestroy({ applicationApiKeyId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo('/application-api-keys', { replace: true });
};
</script>

<template>
  <template v-if="pending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <ResourceInfoTitle :title="data.name">
        <template #prepend>
          <AppAddToFavoritesButton
            :item="data"
            :type="data.resourceType"
            persistent
          />
        </template>
      </ResourceInfoTitle>
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="data"
            :edit-path="`/application-api-keys/${data.id}/edit`"
            :item-label="$t('__fieldApplicationApiKey')"
            :on-delete="handleDelete"
          />
        </template>
      </AppTabs>
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
