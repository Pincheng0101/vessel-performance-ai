import { StateConstant } from '~/constants';
import { SearchEngineActionExecutionPayloadFactory, SearchEngineActionExecutionPayloadResponseFactory } from '~/models/server/searchEngine';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import SearchEngineDefaultOutput from './SearchEngineDefaultOutput';

/**
 * @import { SearchEngineActionExecutionPayload } from '~/models/server/searchEngine'
 */

class SearchEnginePayload extends TaskPayload {
  actionType = StateConstant.ActionType.SEARCH_ENGINE.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {SearchEngineActionExecutionPayload} params.searchEngine
   * @param {SearchEngineDefaultOutput} params.defaultOutput
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    searchEngine,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new SearchEngineDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.searchEngine = jsonPathUtils.isJsonPath(searchEngine) ? searchEngine : SearchEngineActionExecutionPayloadFactory.create(searchEngine);
  }

  /**
   * @param {SearchEnginePayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      search_engine: jsonPathUtils.isJsonPath(actionPayload.searchEngine) ? actionPayload.searchEngine : SearchEngineActionExecutionPayloadFactory.toRequestPayload(actionPayload.searchEngine),
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new SearchEnginePayload({
      defaultOutput: normalized.default_output,
      searchEngine: jsonPathUtils.isJsonPath(normalized.search_engine) ? normalized.search_engine : SearchEngineActionExecutionPayloadResponseFactory.create(normalized.search_engine),
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default SearchEnginePayload;
