<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const server = useServer();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

const createResource = async (resource) => {
  const { data, error } = await server.connector.create(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, data.value.id));
};
</script>

<template>
  <ResourceConnectorForm
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value))"
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
