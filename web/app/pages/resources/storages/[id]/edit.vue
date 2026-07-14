<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const { hasWritePermission } = useResourcePermission();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const state = reactive({
  hasPermission: null,
});

breadcrumbStore.setLoading(true);
state.hasPermission = await hasWritePermission(ResourceConstant.Type.STORAGE.value);

const { data, pending, error } = await server.storage.get({
  storageId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.storage.update(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldStorage')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceStorageForm
      :resource="data"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, data.id))"
    />
  </template>
</template>
