import RankerActionExecutionPayloadResponse from './RankerActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class JaccardSimilarityRankerActionExecutionPayloadResponse extends RankerActionExecutionPayloadResponse {
  constructor({
    docs,
    limit,
    query_string,
    query_template,
    ranker_id,
    ranker_type,
    ranking_fields,
    threshold,
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
    this.threshold = threshold;
  };
}

export default JaccardSimilarityRankerActionExecutionPayloadResponse;
