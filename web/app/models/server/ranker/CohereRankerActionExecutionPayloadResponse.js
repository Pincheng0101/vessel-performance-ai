import RankerActionExecutionPayloadResponse from './RankerActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class CohereRankerActionExecutionPayloadResponse extends RankerActionExecutionPayloadResponse {
  constructor({
    docs,
    limit,
    query_string,
    query_template,
    ranker_id,
    ranker_type,
    ranking_fields,
  } = {}) {
    super({
      docs,
      limit,
      query_string,
      query_template,
      ranker_id,
      ranker_type,
    });
    this.rankingFields = ranking_fields;
  };
}

export default CohereRankerActionExecutionPayloadResponse;
