/**
 * This class receives data from the API with parameters in snake_case.
 */
class MeteringStartAgentCreditUsageResponse {
  constructor({
    execution_arn,
  } = {}) {
    this.executionArn = execution_arn ?? null;
  }
}

export default MeteringStartAgentCreditUsageResponse;
