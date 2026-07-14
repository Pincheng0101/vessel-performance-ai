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

breadcrumbStore.setLoading(true);
state.hasPermission = await hasWritePermission(ResourceConstant.Type.RETRIEVER.value);

const { data, pending, error } = await server.retriever.get({
  retrieverId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.retriever.update(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldRetriever')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceRetrieverForm
      :resource="data"
      :not-found-resource="state.error.notFoundResource"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, data.id))"
    />
  </template>
</template>
