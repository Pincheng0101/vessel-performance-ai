class MeteringGetAgentCreditUsage {
  constructor({
    executionArn,
  } = {}) {
    this.executionArn = executionArn;
  }

  static toRequestPayload(request) {
    return {
      execution_arn: request.executionArn,
    };
  }
}

export default MeteringGetAgentCreditUsage;
