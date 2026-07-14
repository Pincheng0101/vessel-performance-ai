import DatasetItemSyncOutputResponse from './DatasetItemSyncOutputResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemSyncResponse {
  constructor({
    error,
    execution_arn,
    output,
    start_ts,
    status,
    stop_ts,
  } = {}) {
    this.error = error ?? null;
    this.executionArn = execution_arn;
    this.output = output ? new DatasetItemSyncOutputResponse(output) : null;
    this.startTs = start_ts ?? null;
    this.status = status;
    this.stopTs = stop_ts ?? null;
  }
}

export default DatasetItemSyncResponse;
