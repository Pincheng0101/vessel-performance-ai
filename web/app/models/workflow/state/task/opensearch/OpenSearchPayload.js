import { HttpConstant, OpenSearchConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import OpenSearchDefaultOutput from './OpenSearchDefaultOutput';

class OpenSearchPayload extends TaskPayload {
  actionType = StateConstant.ActionType.OPENSEARCH.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.body
   * @param {Object} params.headers
   * @param {Object} params.params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {OpenSearchDefaultOutput} params.defaultOutput
   * @param {string} params.connectorId
   * @param {string} params.method
   * @param {string} params.urlPath
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    body,
    connectorId,
    defaultOutput,
    headers,
    isCacheConnection,
    method,
    params,
    stateMemoryOutputSelector,
    streamingConfig,
    timeout,
    urlPath,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new OpenSearchDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.body = (() => {
      // Can be null, undefined or an object
      if (body === null) return null;
      if (body === undefined) return OpenSearchConstant.ActionExecutionParams.BODY;
      return body;
    })();
    this.connectorId = connectorId;
    this.headers = headers ?? {};
    this.method = method ?? HttpConstant.Method.GET.value;
    this.params = (() => {
      // Can be null, undefined or an object
      if (params === null) return null;
      if (params === undefined) return OpenSearchConstant.ActionExecutionParams.PARAMS;
      return params;
    })();
    this.urlPath = urlPath ?? OpenSearchConstant.ActionExecutionParams.URL_PATH;
    this.isCacheConnection = isCacheConnection ?? OpenSearchConstant.DefaultParams.IS_CACHE_CONNECTION;
    this.timeout = timeout ?? OpenSearchConstant.DefaultParams.TIMEOUT.default;
  }

  /**
   * @param {OpenSearchPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      body: actionPayload.body,
      connector_id: actionPayload.connectorId,
      default_output: actionPayload.defaultOutput,
      headers: actionPayload.headers,
      is_cache_connection: actionPayload.isCacheConnection,
      method: actionPayload.method,
      params: actionPayload.params,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      timeout: actionPayload.timeout,
      url_path: actionPayload.urlPath,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new OpenSearchPayload({
      body: normalized.body,
      connectorId: normalized.connector_id,
      defaultOutput: normalized.default_output,
      headers: normalized.headers,
      isCacheConnection: normalized.is_cache_connection,
      method: normalized.method,
      params: normalized.params,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      timeout: normalized.timeout,
      urlPath: normalized.url_path,
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default OpenSearchPayload;
