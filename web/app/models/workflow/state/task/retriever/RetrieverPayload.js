import { StateConstant } from '~/constants';
import { RetrieverActionExecutionPayloadFactory, RetrieverActionExecutionPayloadResponseFactory } from '~/models/server/retriever';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import RetrieverDefaultOutput from './RetrieverDefaultOutput';

/**
 * @import { RetrieverActionExecutionPayload } from '~/models/server/retriever'
 */

class RetrieverPayload extends TaskPayload {
  actionType = StateConstant.ActionType.RETRIEVER.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {RetrieverActionExecutionPayload} params.retriever
   * @param {RetrieverDefaultOutput} params.defaultOutput
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    retriever,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new RetrieverDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.retriever = jsonPathUtils.isJsonPath(retriever) ? retriever : RetrieverActionExecutionPayloadFactory.create(retriever);
  }

  /**
   * @param {RetrieverPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      retriever: jsonPathUtils.isJsonPath(actionPayload.retriever) ? actionPayload.retriever : RetrieverActionExecutionPayloadFactory.toRequestPayload(actionPayload.retriever),
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new RetrieverPayload({
      defaultOutput: normalized.default_output,
      retriever: jsonPathUtils.isJsonPath(normalized.retriever) ? normalized.retriever : RetrieverActionExecutionPayloadResponseFactory.create(normalized.retriever),
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default RetrieverPayload;
