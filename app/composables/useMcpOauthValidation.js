import { AgentConstant } from '~/constants';
import { ValidateAgentTools } from '~/models/server/agent';

export const useMcpOauthValidation = (agentData) => {
  const server = useServer();
  const { getToken, getRefreshToken, getHasConnected } = useMcpOauthToken();
  const { refresh } = useMcpOauthRefresh();

  const oauthMcpTools = computed(() =>
    (agentData.value?.tools || []).filter(tool => tool.isOauth),
  );

  const hasOauthTools = computed(() => oauthMcpTools.value.length > 0);

  const validationResults = ref({});
  const pending = ref(false);

  const eachKeyedTool = (callback) => {
    let firstUnnamedHandled = false;
    oauthMcpTools.value.forEach((tool) => {
      let key;
      if (tool.name) {
        key = tool.name;
      } else if (firstUnnamedHandled) {
        return;
      } else {
        key = AgentConstant.ToolType.MCP_SERVER.value;
        firstUnnamedHandled = true;
      }
      callback(key, tool);
    });
  };

  const buildToolRuntimeConfig = () => {
    const config = {};
    eachKeyedTool((key, tool) => {
      const token = getToken(tool.mcpServerId);
      if (!token) return;
      config[key] = {
        tool_type: AgentConstant.ToolType.MCP_SERVER.value,
        headers: { Authorization: `Bearer ${token}` },
      };
    });
    return config;
  };

  const validate = async () => {
    const agentId = agentData.value?.id;
    if (!agentId || !hasOauthTools.value) return;

    pending.value = true;

    try {
      await Promise.all(oauthMcpTools.value.map(async (tool) => {
        if (!getToken(tool.mcpServerId) && getRefreshToken(tool.mcpServerId) && tool.auth?.endpoint) {
          await refresh(tool.mcpServerId, tool.auth.endpoint);
        }
      }));

      const { data, error } = await server.agent.validateTools(
        new ValidateAgentTools({ agentId, toolRuntimeConfig: buildToolRuntimeConfig() }),
        { lazy: false },
      );

      if (error.value) return;

      const keyToMcpServerId = {};
      eachKeyedTool((key, tool) => {
        keyToMcpServerId[key] = tool.mcpServerId;
      });

      const results = {};
      Object.entries(data.value?.results || {}).forEach(([key, result]) => {
        const mcpServerId = keyToMcpServerId[key];
        if (mcpServerId) {
          results[mcpServerId] = result;
        }
      });
      validationResults.value = results;
    } finally {
      pending.value = false;
    }
  };

  const getToolStatus = (mcpServerId) => {
    if (!getToken(mcpServerId)) {
      return getHasConnected(mcpServerId) ? AgentConstant.McpOauthStatus.EXPIRED.value : AgentConstant.McpOauthStatus.UNCONNECTED.value;
    }
    if (!pending.value && validationResults.value[mcpServerId]?.ok === false) {
      return AgentConstant.McpOauthStatus.EXPIRED.value;
    }
    return AgentConstant.McpOauthStatus.CONNECTED.value;
  };

  onMounted(() => validate());

  return {
    oauthMcpTools,
    hasOauthTools,
    validationResults,
    pending,
    validate,
    getToolStatus,
    buildToolRuntimeConfig,
  };
};
