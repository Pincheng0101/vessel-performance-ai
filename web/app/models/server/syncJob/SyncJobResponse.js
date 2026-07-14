import SyncJob from './SyncJob';
import SyncJobSystemInfoResponse from './SyncJobSystemInfoResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class SyncJobResponse extends SyncJob {
  constructor({
    execution_arn,
    force_full_sync,
    ignore_failed,
    loader_id,
    mode,
    status,
    sync_job_id,
    system_info,
    updated_ts,
  } = {}) {
    super({
      executionArn: execution_arn,
      forceFullSync: force_full_sync,
      ignoreFailed: ignore_failed,
      loaderId: loader_id,
      mode,
      status,
      syncJobId: sync_job_id,
      systemInfo: system_info ? new SyncJobSystemInfoResponse(system_info) : {},
      updatedTs: updated_ts,
    });
  }
}

export default SyncJobResponse;
