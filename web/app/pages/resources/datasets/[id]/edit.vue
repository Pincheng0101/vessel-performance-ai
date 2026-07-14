<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const { hasWritePermission } = useResourcePermission();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { createSignal } = useAbortController();

const state = reactive({
  hasPermission: null,
});

breadcrumbStore.setLoading(true);
state.hasPermission = await hasWritePermission(ResourceConstant.Type.DATASET.value);

const signal = createSignal();

const { data, pending, error } = await server.dataset.get({
  datasetId: route.params.id,
}, {
  signal,
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.dataset.update(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldDataset')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceDatasetForm
      :resource="data"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, data.id))"
    />
  </template>
</template>
