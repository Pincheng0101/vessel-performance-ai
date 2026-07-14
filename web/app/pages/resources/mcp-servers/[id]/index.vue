<script setup>
import { McpServerConstant, ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { isOauthDialogOpen, isWaitingAuth, isTestingAuth, isTestingConnection, testOauthFlow, testConnection, startAuthorization, cancelOauthFlow } = useMcpServerOauthTest();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.mcpServer.get({
  mcpServerId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const streamableHttpAuthType = computed(() => {
  if (data.value?.mcpServerType !== McpServerConstant.Type.STREAMABLE_HTTP.value) return null;
  return data.value?.auth?.authType ?? null;
});

const isHeaderAuth = computed(() => streamableHttpAuthType.value === McpServerConstant.StreamableHttpAuthType.HEADER.value);
const isTesting = computed(() => isHeaderAuth.value ? isTestingConnection.value : isTestingAuth.value);
const handleTest = computed(() => isHeaderAuth.value ? handleTestConnection : handleTestAuth);

const handleTestConnection = () => testConnection({
  endpointUrl: data.value.endpointUrl,
  auth: data.value.auth,
  mcpServerType: data.value.mcpServerType,
});

const handleTestAuth = () => {
  testOauthFlow(data.value.endpointUrl, data.value.auth, data.value.mcpServerType);
};

const handleDelete = async ({ mcpServerId }) => {
  const { error } = await server.mcpServer.destroy({ mcpServerId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.mcpServer.duplicate({
    mcpServerId: route.params.id,
    newMcpServerName: resource.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, data.value.id));
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
          { title: $t('__titleTool', 2), value: 'tools' },
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="data"
            :module="ResourceConstant.Type.MCP_SERVER.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, data.id)}/edit`"
            :item-label="$t('__fieldMcpServer')"
            :allow-delete-recursively="ResourceConstant.Type.MCP_SERVER.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.MCP_SERVER.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template
              v-if="streamableHttpAuthType"
              #prepend-actions
            >
              <AppIconButton
                :aria-label="$t('__actionTestConnection')"
                icon="mdi-lan-connect"
                variant="text"
                :tooltip="$t('__actionTestConnection')"
                :loading="isTesting"
                :on-click="handleTest"
              >
                <template #loader>
                  <AppProgressCircular
                    :size="14"
                    :width="2"
                  />
                </template>
              </AppIconButton>
            </template>
          </ResourceDetailsCard>
        </template>
        <template #tools>
          <ResourceMcpServerToolList
            :mcp-server-id="data.id"
            :auth-type="data.auth?.authType ?? null"
            :endpoint-url="data.endpointUrl"
          />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.MCP_SERVER.value"
            :lowercase-resource-title="false"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.MCP_SERVER.value"
            :lowercase-resource-title="false"
          />
        </template>
      </AppTabs>
      <ResourceMcpServerOauthDialog
        v-model="isOauthDialogOpen"
        :is-waiting="isWaitingAuth"
        :on-start-auth="startAuthorization"
        :on-cancel="cancelOauthFlow"
      />
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldMcpServer')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
