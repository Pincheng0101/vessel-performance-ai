class MeteringDescribeQueryTokenUsage {
  constructor({
    maxResults,
    nextToken,
    queryExecutionId,
  } = {}) {
    this.maxResults = maxResults;
    this.nextToken = nextToken;
    this.queryExecutionId = queryExecutionId;
  }

  /**
   * @param {MeteringDescribeQueryTokenUsage} request
   */
  static toRequestPayload(request) {
    return {
      query_execution_id: request.queryExecutionId,
      max_results: request.maxResults,
      next_token: request.nextToken,
    };
  }
}

export default MeteringDescribeQueryTokenUsage;
