import { StateConstant } from '~/constants';
import { RankerActionExecutionPayloadFactory, RankerActionExecutionPayloadResponseFactory } from '~/models/server/ranker';
import { RetrieverActionExecutionPayloadFactory, RetrieverActionExecutionPayloadResponseFactory } from '~/models/server/retriever';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import RetrievalDefaultOutput from './RetrievalDefaultOutput';

/**
 * @import { RankerActionExecutionPayload } from '~/models/server/ranker'
 * @import { RetrieverActionExecutionPayload } from '~/models/server/retriever'
 */

class RetrievalPayload extends TaskPayload {
  actionType = StateConstant.ActionType.RETRIEVAL.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {RankerActionExecutionPayload} params.ranker
   * @param {RetrievalDefaultOutput} params.defaultOutput
   * @param {RetrieverActionExecutionPayload[]} params.retrievers
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    ranker,
    retrievers = [],
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new RetrievalDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.ranker = jsonPathUtils.isJsonPath(ranker) ? ranker : RankerActionExecutionPayloadFactory.create(ranker);
    this.retrievers = jsonPathUtils.isJsonPath(retrievers) ? retrievers : retrievers.map(RetrieverActionExecutionPayloadFactory.create);
  }

  /**
   * @param {RetrievalPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      ranker: jsonPathUtils.isJsonPath(actionPayload.ranker) ? actionPayload.ranker : RankerActionExecutionPayloadFactory.toRequestPayload(actionPayload.ranker),
      retrievers: jsonPathUtils.isJsonPath(actionPayload.retrievers) ? actionPayload.retrievers : actionPayload.retrievers.map(RetrieverActionExecutionPayloadFactory.toRequestPayload),
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new RetrievalPayload({
      defaultOutput: normalized.default_output,
      ranker: jsonPathUtils.isJsonPath(normalized.ranker) ? normalized.ranker : RankerActionExecutionPayloadResponseFactory.create(normalized.ranker),
      retrievers: jsonPathUtils.isJsonPath(normalized.retrievers) ? normalized.retrievers : normalized.retrievers.map(RetrieverActionExecutionPayloadResponseFactory.create),
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default RetrievalPayload;
