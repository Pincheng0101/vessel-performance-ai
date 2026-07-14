import DatasetItemFailureResponse from './DatasetItemFailureResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemSyncOutputResponse {
  constructor({
    dataset_id,
    failures,
    inserted_count,
    latest_version,
    sync_status,
    error_message,
  } = {}) {
    this.datasetId = dataset_id ?? '';
    this.failures = failures?.length > 0 ? failures.map(failure => new DatasetItemFailureResponse(failure)) : [];
    this.insertedCount = inserted_count ?? 0;
    this.latestVersion = latest_version ?? 0;
    this.syncStatus = sync_status ?? null;
    this.errorMessage = error_message ?? '';
  }
}

export default DatasetItemSyncOutputResponse;
