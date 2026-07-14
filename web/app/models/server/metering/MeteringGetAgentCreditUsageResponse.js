import { UsageConstant } from '~/constants';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MeteringGetAgentCreditUsageResponse {
  constructor({
    state,
    credit_used,
    tier_threshold,
    quota,
    usage_month,
    usage_period,
    error_message,
  } = {}) {
    this.state = state;
    this.creditUsed = credit_used ?? null;
    this.tierThreshold = tier_threshold ?? null;
    this.quota = quota ?? null;
    this.usageMonth = usage_month ?? null;
    this.usagePeriod = usage_period ?? null;
    this.errorMessage = error_message ?? null;
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

export default MeteringGetAgentCreditUsageResponse;
