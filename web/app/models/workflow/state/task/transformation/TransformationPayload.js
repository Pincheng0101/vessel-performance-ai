import { StateConstant } from '~/constants';
import { TransformationActionExecutionPayloadFactory, TransformationActionExecutionPayloadResponseFactory } from '~/models/server/transformation';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import TransformationDefaultOutput from './TransformationDefaultOutput';

/**
 * @import { TransformationActionExecutionPayload } from '~/models/server/transformation'
 */

class TransformationPayload extends TaskPayload {
  actionType = StateConstant.ActionType.TRANSFORMATION.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {TaskStreamingConfig} params.streamingConfig
   * @param {TransformationActionExecutionPayload} params.transformation
   * @param {TransformationDefaultOutput} params.defaultOutput
   */
  constructor({
    defaultOutput,
    stateMemoryOutputSelector,
    streamingConfig,
    transformation,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new TransformationDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.transformation = TransformationActionExecutionPayloadFactory.create(transformation);
  }

  /**
   * @param {TransformationPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      transformation: jsonPathUtils.isJsonPath(actionPayload.transformation) ? actionPayload.transformation : TransformationActionExecutionPayloadFactory.toRequestPayload(actionPayload.transformation),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new TransformationPayload({
      defaultOutput: normalized.default_output,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      transformation: jsonPathUtils.isJsonPath(normalized.transformation) ? normalized.transformation : TransformationActionExecutionPayloadResponseFactory.create(normalized.transformation),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default TransformationPayload;
