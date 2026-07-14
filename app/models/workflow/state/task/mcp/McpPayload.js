import { McpServerConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import McpDefaultOutput from './McpDefaultOutput';

class McpPayload extends TaskPayload {
  actionType = StateConstant.ActionType.MCP.value;

  /**
   * @param {McpDefaultOutput} params.defaultOutput
   * @param {Object} params.input
   * @param {string} params.mcpServerId
   * @param {Object} params.stateMemoryOutputSelector
   * @param {TaskStreamingConfig} params.streamingConfig
   * @param {string} params.toolName
   * @param {boolean} params.useExternalMemoryOutput
   */
  constructor({
    defaultOutput,
    input,
    mcpServerId,
    stateMemoryOutputSelector,
    streamingConfig,
    toolName,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new McpDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.input = input ?? McpServerConstant.ActionExecutionParams.INPUT;
    this.mcpServerId = mcpServerId ?? '';
    this.toolName = toolName ?? '';
  }

  /**
   * @param {McpPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      input: actionPayload.input,
      mcp_server_id: actionPayload.mcpServerId,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      tool_name: actionPayload.toolName,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new McpPayload({
      defaultOutput: normalized.default_output,
      input: normalized.input,
      mcpServerId: normalized.mcp_server_id,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      toolName: normalized.tool_name,
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default McpPayload;
