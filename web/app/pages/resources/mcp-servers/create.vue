<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 * @import { McpServerErrorResponse } from '~/models/server/mcpServer'
 */

const server = useServer();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
  /**
   * @type {McpServerErrorResponse}
   */
  errors: {},
});

const createResource = async (resource) => {
  const { data, error } = await server.mcpServer.create(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, data.value.id));
};
</script>

<template>
  <ResourceMcpServerForm
    :not-found-resource="state.error.notFoundResource"
    :errors="state.errors"
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value))"
  />
</template>
