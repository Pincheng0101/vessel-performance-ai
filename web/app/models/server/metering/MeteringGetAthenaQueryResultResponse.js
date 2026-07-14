import { UsageConstant } from '~/constants';

class MeteringGetAthenaQueryResultResponse {
  constructor({
    error_message,
    is_truncated,
    presigned_url,
    rows,
    state,
  } = {}) {
    this.errorMessage = error_message ?? null;
    this.isTruncated = is_truncated ?? null;
    this.presignedUrl = presigned_url ?? null;
    this.rows = rows ?? [];
    this.state = state;
  }

  get isPending() {
    return this.state === UsageConstant.SfnExecutionState.RUNNING.value;
  }

  get isSucceeded() {
    return this.state === UsageConstant.SfnExecutionState.SUCCEEDED.value;
  }

  get isFailed() {
    return [
      UsageConstant.SfnExecutionState.FAILED.value,
      UsageConstant.SfnExecutionState.TIMED_OUT.value,
      UsageConstant.SfnExecutionState.ABORTED.value,
    ].includes(this.state);
  }
}

export default MeteringGetAthenaQueryResultResponse;
