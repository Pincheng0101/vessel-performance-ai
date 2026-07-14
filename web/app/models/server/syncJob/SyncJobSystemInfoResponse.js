import SyncJobSystemInfo from './SyncJobSystemInfo';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class SyncJobSystemInfoResponse extends SyncJobSystemInfo {
  constructor({
    total_objects,
    total_docs,
    exceptions,
    error,
    cause,
    start_ts,
    stop_ts,
  } = {}) {
    super({
      totalObjects: total_objects,
      totalDocs: total_docs,
      exceptions,
      error,
      cause,
      startTs: start_ts,
      stopTs: stop_ts,
    });
  }
}

export default SyncJobSystemInfoResponse;
