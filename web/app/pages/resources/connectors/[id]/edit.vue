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
state.hasPermission = await hasWritePermission(ResourceConstant.Type.CONNECTOR.value);

const { data, pending, error } = await server.connector.get({
  connectorId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.connector.update(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldConnector')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceConnectorForm
      :resource="data"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, data.id))"
      :hidden-fields="[
        'connectorId',
        'databaseName',
        'fileExtensions',
        'indexName',
        'lastModifiedTsField',
        's3Bucket',
        's3Prefix',
        'tableName',
      ]"
    />
  </template>
</template>
