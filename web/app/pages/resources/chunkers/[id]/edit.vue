<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const route = useRoute();
const server = useServer();
const { hasWritePermission } = useResourcePermission();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
  hasPermission: null,
});

state.hasPermission = await hasWritePermission(ResourceConstant.Type.CHUNKER.value);
breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.chunker.get({
  chunkerId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.chunker.update(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldChunker')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceChunkerForm
      :resource="data"
      :not-found-resource="state.error.notFoundResource"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, data.id))"
    />
  </template>
</template>
