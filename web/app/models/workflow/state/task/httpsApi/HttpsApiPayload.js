import { HttpConstant, HttpsApiConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import HttpsApiDefaultOutput from './HttpsApiDefaultOutput';

class HttpsApiPayload extends TaskPayload {
  actionType = StateConstant.ActionType.HTTPS_API.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {HttpsApiDefaultOutput} params.defaultOutput
   * @param {Object} params
   * @param {Object} params.headers
   * @param {Object} params.stateMemoryOutputSelector
   * @param {string} params.body
   * @param {string} params.connectorId
   * @param {string} params.method
   * @param {string} params.params
   * @param {string} params.url
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    body,
    connectorId,
    defaultOutput,
    headers,
    method,
    params,
    url,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new HttpsApiDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.body = (() => {
      // Can be null, undefined or an object
      if (body === null) return null;
      if (body === undefined) return HttpsApiConstant.ActionExecutionParams.BODY;
      return body;
    })();
    this.connectorId = connectorId;
    this.headers = headers ?? {};
    this.method = method ?? HttpConstant.Method.GET.value;
    this.params = (() => {
      // Can be null, undefined or an object
      if (params === null) return null;
      if (params === undefined) return HttpsApiConstant.ActionExecutionParams.PARAMS;
      return params;
    })();
    this.url = url ?? HttpsApiConstant.ActionExecutionParams.URL;
  }

  /**
   * @param {HttpsApiPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      body: actionPayload.body,
      connector_id: actionPayload.connectorId,
      default_output: actionPayload.defaultOutput,
      headers: actionPayload.headers,
      method: actionPayload.method,
      params: actionPayload.params,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      url: actionPayload.url,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new HttpsApiPayload({
      body: normalized.body,
      connectorId: normalized.connector_id,
      defaultOutput: normalized.default_output,
      headers: normalized.headers,
      method: normalized.method,
      params: normalized.params,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      url: normalized.url,
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default HttpsApiPayload;
