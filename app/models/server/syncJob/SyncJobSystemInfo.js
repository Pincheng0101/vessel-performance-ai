class SyncJobSystemInfo {
  constructor({
    totalObjects,
    totalDocs,
    exceptions,
    error,
    cause,
    startTs,
    stopTs,
  } = {}) {
    this.totalObjects = totalObjects;
    this.totalDocs = totalDocs;
    this.exceptions = exceptions;
    this.error = error;
    this.cause = cause;
    this.startTs = startTs;
    this.stopTs = stopTs;
  }
}

export default SyncJobSystemInfo;
