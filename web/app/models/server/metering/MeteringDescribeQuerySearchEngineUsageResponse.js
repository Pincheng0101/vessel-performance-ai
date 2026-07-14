import { UsageConstant } from '~/constants';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MeteringDescribeQuerySearchEngineUsageResponse {
  constructor({
    error_message,
    next_token,
    rows,
    state,
  } = {}) {
    this.errorMessage = error_message ?? null;
    this.nextToken = next_token ?? null;
    this.rows = rows ?? [];
    this.state = state;
  }

  get isPending() {
    return [
      UsageConstant.MeteringQueryState.QUEUED.value,
      UsageConstant.MeteringQueryState.RUNNING.value,
    ].includes(this.state);
  }

  get isSucceeded() {
    return this.state === UsageConstant.MeteringQueryState.SUCCEEDED.value;
  }

  get isFailed() {
    return this.state === UsageConstant.MeteringQueryState.FAILED.value;
  }
}

export default MeteringDescribeQuerySearchEngineUsageResponse;
