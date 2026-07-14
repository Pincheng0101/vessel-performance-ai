/**
 * This class receives data from the API with parameters in snake_case.
 */
class MeteringStartQueryTokenUsageResponse {
  constructor({
    query_execution_id,
  } = {}) {
    this.queryExecutionId = query_execution_id;
  }
}

export default MeteringStartQueryTokenUsageResponse;
