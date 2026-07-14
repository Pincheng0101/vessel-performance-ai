<script setup>
import { McpServerConstant } from '~/constants';

const server = useServer();
const { authorize } = useMcpServerOauthTest();

const props = defineProps({
  mcpServerId: {
    type: String,
    required: true,
  },
  authType: {
    type: String,
    default: null,
  },
  endpointUrl: {
    type: String,
    default: null,
  },
});

const state = reactive({
  isLoading: false,
  tools: [],
  accessToken: null,
});

const isOauthAuth = computed(() => props.authType === McpServerConstant.StreamableHttpAuthType.OAUTH.value);
const showAuthorize = computed(() => isOauthAuth.value && !state.accessToken);

const fetchTools = async () => {
  state.isLoading = true;
  state.tools = [];
  const { data, error } = await server.mcpServer.listTools({
    mcpServerId: props.mcpServerId,
    accessToken: state.accessToken,
  }, {
    lazy: false,
  });
  if (error.value) {
    if (isOauthAuth.value) state.accessToken = null;
    state.isLoading = false;
    return;
  }
  state.tools = data.value.data;
  state.isLoading = false;
};

const handleAuthorize = async () => {
  const accessToken = await authorize(props.endpointUrl);
  if (!accessToken) return;
  state.accessToken = accessToken;
  await fetchTools();
};

if (!isOauthAuth.value) {
  fetchTools();
}
</script>

<template>
  <AppTable
    :title="$t('__titleTool', 2)"
    :server-side="false"
    :icon="McpServerConstant.Base.TOOL.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name' },
    ]"
    :items="state.isLoading ? [] : state.tools"
    :loading="state.isLoading"
    enable-expand
    item-value="name"
  >
    <template #title-actions>
      <AppButton
        v-if="showAuthorize"
        :text="$t('__actionConnect')"
        color="primary"
        :width="100"
        :on-click="handleAuthorize"
      />
    </template>
    <template #header-actions>
      <AppIconButton
        v-if="!showAuthorize"
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        :loading="state.isLoading"
        @click="fetchTools()"
      >
        <template #loader>
          <AppProgressCircular
            :size="14"
            :width="2"
          />
        </template>
      </AppIconButton>
    </template>
    <template #no-data>
      <AppInfoCard
        v-if="showAuthorize"
        :title="$t('__messageOauthConnectRequired')"
        icon="mdi-lock-outline"
        min-height="400"
      />
      <AppInfoCard
        v-else
        :title="$t('__titleNoTool')"
        icon="mdi-toolbox"
        min-height="400"
      />
    </template>
    <template #expanded-row="{ item }">
      <div class="py-3">
        <ResourceMcpServerToolRow
          :mcp-server-id="props.mcpServerId"
          :access-token="state.accessToken"
          :tool="item"
        />
      </div>
    </template>
  </AppTable>
</template>
