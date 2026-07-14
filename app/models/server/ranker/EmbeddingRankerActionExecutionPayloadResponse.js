import RankerActionExecutionPayloadResponse from './RankerActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class EmbeddingRankerActionExecutionPayloadResponse extends RankerActionExecutionPayloadResponse {
  constructor({
    content_template,
    docs,
    limit,
    query_string,
    query_template,
    ranker_id,
    ranker_type,
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
    this.contentTemplate = content_template;
    this.threshold = threshold;
  };
}

export default EmbeddingRankerActionExecutionPayloadResponse;
