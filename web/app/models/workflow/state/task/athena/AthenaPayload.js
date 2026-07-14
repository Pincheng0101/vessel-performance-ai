import { AthenaConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import AthenaDefaultOutput from './AthenaDefaultOutput';

class AthenaPayload extends TaskPayload {
  actionType = StateConstant.ActionType.ATHENA.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {AthenaDefaultOutput} params.defaultOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {string} params.catalog
   * @param {string} params.connectorId
   * @param {string} params.database
   * @param {number} params.maxRows
   * @param {string} params.outputLocation
   * @param {string} params.query
   * @param {boolean} params.readOnly
   * @param {TaskStreamingConfig} params.streamingConfig
   * @param {number} params.waitTimeout
   * @param {string} params.workgroup
   */
  constructor({
    catalog,
    connectorId,
    database,
    defaultOutput,
    maxRows,
    outputLocation,
    query,
    readOnly,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
    waitTimeout,
    workgroup,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new AthenaDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.catalog = catalog ?? null;
    this.connectorId = connectorId;
    this.database = database ?? null;
    this.maxRows = maxRows ?? AthenaConstant.DefaultParams.MAX_ROWS.default;
    this.outputLocation = outputLocation ?? null;
    this.query = query ?? AthenaConstant.DefaultParams.QUERY;
    this.readOnly = readOnly ?? AthenaConstant.DefaultParams.READ_ONLY;
    this.waitTimeout = waitTimeout ?? AthenaConstant.DefaultParams.WAIT_TIMEOUT.default;
    this.workgroup = workgroup ?? null;
  }

  /**
   * @param {AthenaPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      catalog: actionPayload.catalog,
      connector_id: actionPayload.connectorId,
      database: actionPayload.database,
      default_output: actionPayload.defaultOutput,
      max_rows: actionPayload.maxRows,
      output_location: actionPayload.outputLocation,
      query: actionPayload.query,
      read_only: actionPayload.readOnly,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
      wait_timeout: actionPayload.waitTimeout,
      workgroup: actionPayload.workgroup,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new AthenaPayload({
      catalog: normalized.catalog,
      connectorId: normalized.connector_id,
      database: normalized.database,
      defaultOutput: normalized.default_output,
      maxRows: normalized.max_rows,
      outputLocation: normalized.output_location,
      query: normalized.query,
      readOnly: normalized.read_only,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
      waitTimeout: normalized.wait_timeout,
      workgroup: normalized.workgroup,
    });
  }
}

export default AthenaPayload;
