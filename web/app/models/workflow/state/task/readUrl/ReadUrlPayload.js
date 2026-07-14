import { ReadUrlConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import ReadUrlDefaultOutput from './ReadUrlDefaultOutput';

class ReadUrlPayload extends TaskPayload {
  actionType = StateConstant.ActionType.READ_URL.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {number} params.limit
   * @param {Object} params
   * @param {Object} params.headers
   * @param {Object} params.stateMemoryOutputSelector
   * @param {ReadUrlDefaultOutput} params.defaultOutput
   * @param {string} params.format
   * @param {string} params.url
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    connectorId,
    defaultOutput,
    format,
    headers,
    limit,
    stateMemoryOutputSelector,
    streamingConfig,
    url,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new ReadUrlDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.connectorId = connectorId ?? null;
    this.format = format ?? ReadUrlConstant.ActionExecutionParams.FORMAT;
    this.headers = headers ?? {};
    this.limit = (() => {
      // Can be null, undefined or a number
      if (limit === null) return null;
      if (limit === undefined) return ReadUrlConstant.ActionExecutionParams.LIMIT.default;
      return limit;
    })();
    this.url = url ?? ReadUrlConstant.ActionExecutionParams.URL;
  }

  /**
   * @param {ReadUrlPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      connector_id: actionPayload.connectorId,
      default_output: actionPayload.defaultOutput,
      format: actionPayload.format,
      headers: actionPayload.headers,
      limit: actionPayload.limit,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      url: actionPayload.url,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new ReadUrlPayload({
      connectorId: normalized.connector_id,
      defaultOutput: normalized.default_output,
      format: normalized.format,
      headers: normalized.headers,
      limit: normalized.limit,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      url: normalized.url,
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default ReadUrlPayload;
