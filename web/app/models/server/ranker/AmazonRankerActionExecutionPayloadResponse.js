import RankerActionExecutionPayloadResponse from './RankerActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AmazonRankerActionExecutionPayloadResponse extends RankerActionExecutionPayloadResponse {
  constructor({
    docs,
    limit,
    query_string,
    query_template,
    ranker_id,
    ranker_type,
    ranker_fields,
  } = {}) {
    super({
      docs,
      limit,
      query_string,
      query_template,
      ranker_id,
      ranker_type,
    });
    this.rankerFields = ranker_fields;
  };
}

export default AmazonRankerActionExecutionPayloadResponse;
