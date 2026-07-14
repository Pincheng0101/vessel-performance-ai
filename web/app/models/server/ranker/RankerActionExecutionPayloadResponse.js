import RankerActionExecutionPayload from '~/models/server/ranker/RankerActionExecutionPayload';
import { TemplateRenderBlockActionExecutionPayloadResponse } from '~/models/server/templateRenderBlock';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class RankerActionExecutionPayloadResponse extends RankerActionExecutionPayload {
  constructor({
    docs,
    limit,
    query_string,
    query_template,
    ranker_id,
    ranker_type,
  } = {}) {
    super({
      rankerId: ranker_id,
      rankerType: ranker_type,
    });
    this.docs = docs;
    this.limit = limit;
    this.queryString = query_string;
    this.queryTemplate = query_template ? new TemplateRenderBlockActionExecutionPayloadResponse(query_template) : query_template;
  };
}

export default RankerActionExecutionPayloadResponse;
