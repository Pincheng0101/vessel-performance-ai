import { MySqlConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import MySqlDefaultOutput from './MySqlDefaultOutput';

class MySqlPayload extends TaskPayload {
  actionType = StateConstant.ActionType.MYSQL.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {MySqlDefaultOutput} params.defaultOutput
   * @param {Object} params
   * @param {Object} params.args
   * @param {Object} params.stateMemoryOutputSelector
   * @param {string} params.connectorId
   * @param {string} params.database
   * @param {string} params.query
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    args,
    connectorId,
    database,
    defaultOutput,
    query,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new MySqlDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.args = (() => {
      // Can be null, undefined or an object
      if (args === null) return null;
      if (args === undefined) return MySqlConstant.ActionExecutionParams.ARGS;
      return args;
    })();
    this.connectorId = connectorId;
    this.database = database;
    this.query = query;
  }

  /**
   * @param {MySqlPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      args: actionPayload.args,
      connector_id: actionPayload.connectorId,
      database: actionPayload.database,
      default_output: actionPayload.defaultOutput,
      query: actionPayload.query,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new MySqlPayload({
      args: normalized.args,
      connectorId: normalized.connector_id,
      database: normalized.database,
      defaultOutput: normalized.default_output,
      query: normalized.query,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default MySqlPayload;
