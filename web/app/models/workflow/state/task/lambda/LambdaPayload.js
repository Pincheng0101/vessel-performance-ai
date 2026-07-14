import { StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import LambdaDefaultOutput from './LambdaDefaultOutput';

class LambdaPayload extends TaskPayload {
  actionType = StateConstant.ActionType.LAMBDA.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {LambdaDefaultOutput} params.defaultOutput
   * @param {Object} params
   * @param {Object} params.payload
   * @param {Object} params.stateMemoryOutputSelector
   * @param {string} params.lambdaFunctionId
   * @param {string} params.lambdaFunctionName
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    lambdaFunctionId,
    lambdaFunctionName,
    payload,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new LambdaDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.lambdaFunctionId = lambdaFunctionId ?? null;
    this.lambdaFunctionName = lambdaFunctionName ?? null;
    this.payload = payload;
  }

  /**
   * @param {LambdaPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      lambda_function_id: actionPayload.lambdaFunctionId ?? null,
      lambda_function_name: actionPayload.lambdaFunctionName ?? null,
      payload: actionPayload.payload,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new LambdaPayload({
      defaultOutput: normalized.default_output,
      lambdaFunctionId: normalized.lambda_function_id,
      lambdaFunctionName: normalized.lambda_function_name,
      payload: normalized.payload,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default LambdaPayload;
