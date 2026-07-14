<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 * @import { McpServerErrorResponse } from '~/models/server/mcpServer'
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
  /**
   * @type {McpServerErrorResponse}
   */
  errors: {},
  hasPermission: null,
});

state.hasPermission = await hasWritePermission(ResourceConstant.Type.MCP_SERVER.value);
breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.mcpServer.get({
  mcpServerId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.mcpServer.update(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldMcpServer')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceMcpServerForm
      :resource="data"
      :not-found-resource="state.error.notFoundResource"
      :errors="state.errors"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, data.id))"
    />
  </template>
</template>
