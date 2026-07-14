import { StateConstant } from '~/constants';
import { RankerActionExecutionPayloadFactory, RankerActionExecutionPayloadResponseFactory } from '~/models/server/ranker';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import RankerDefaultOutput from './RankerDefaultOutput';

/**
 * @import { RankerActionExecutionPayload } from '~/models/server/ranker';
 */

class RankerPayload extends TaskPayload {
  actionType = StateConstant.ActionType.RANKER.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {RankerActionExecutionPayload} params.ranker
   * @param {RankerDefaultOutput} params.defaultOutput
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    ranker,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new RankerDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.ranker = jsonPathUtils.isJsonPath(ranker) ? ranker : RankerActionExecutionPayloadFactory.create(ranker);
  }

  /**
   * @param {RankerPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      ranker: jsonPathUtils.isJsonPath(actionPayload.ranker) ? actionPayload.ranker : RankerActionExecutionPayloadFactory.toRequestPayload(actionPayload.ranker),
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new RankerPayload({
      defaultOutput: normalized.default_output,
      ranker: jsonPathUtils.isJsonPath(normalized.ranker) ? normalized.ranker : RankerActionExecutionPayloadResponseFactory.create(normalized.ranker),
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default RankerPayload;
