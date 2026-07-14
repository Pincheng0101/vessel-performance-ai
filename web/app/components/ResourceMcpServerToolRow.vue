<script setup>
/**
 * @import { McpServerTool } from '~/models/server/mcpServer'
 */

const server = useServer();

const props = defineProps({
  mcpServerId: {
    type: String,
    required: true,
  },
  /**
   * @type {McpServerTool}
   */
  tool: {
    type: Object,
    required: true,
  },
  accessToken: {
    type: String,
    default: null,
  },
});

const state = reactive({
  output: null,
  refreshForm: 0,
});

const callTool = async ({ mcpServerId, toolName, input }) => {
  const { data, error } = await server.mcpServer.callTool({
    mcpServerId,
    toolName,
    input,
    accessToken: props.accessToken,
  }, {
    lazy: false,
  });
  if (error.value) {
    return;
  }
  state.output = data.value;
};
</script>

<template>
  <AppDisplayFieldGroup
    class="mb-2"
    :items="[
      {
        title: $t('__fieldDescription'),
        value: props.tool.description,
      },
    ]"
  />
  <ResourceMcpServerToolCallForm
    :key="`form-${props.tool.name}-${state.refreshForm}`"
    :mcp-server-id="props.mcpServerId"
    :tool-name="props.tool.name"
    :input-schema="props.tool.inputSchema"
    :on-submit="callTool"
    :on-clear="() => {
      state.output = null;
      state.refreshForm += 1;
    }"
  />
  <AppDisplayFieldGroup
    v-if="state.output"
    :items="[
      {
        title: $t('__fieldOutput'),
        value: state.output,
        isJsonToMarkdown: true,
      },
    ]"
  />
</template>
