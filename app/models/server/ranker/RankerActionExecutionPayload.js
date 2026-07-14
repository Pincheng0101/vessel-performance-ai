import { RankerConstant } from '~/constants';
import { TemplateRenderBlockActionExecutionPayload } from '~/models/server/templateRenderBlock';

class RankerActionExecutionPayload {
  constructor({
    docs,
    limit,
    queryString,
    queryTemplate,
    rankerId,
    rankerType,
  } = {}) {
    this.docs = docs ?? RankerConstant.ActionExecutionParams.RANKER_DOCS.default;
    this.limit = limit ?? RankerConstant.ActionExecutionParams.RANKER_LIMIT.default;
    this.queryString = queryString ?? null;
    this.queryTemplate = queryTemplate ? new TemplateRenderBlockActionExecutionPayload(queryTemplate) : queryTemplate;
    this.rankerId = rankerId;
    this.rankerType = rankerType;
  };

  /**
   * @param {RankerActionExecutionPayload} ranker
   */
  static toRequestPayload(ranker) {
    return {
      docs: ranker.docs,
      limit: ranker.limit,
      query_string: ranker.queryString,
      query_template: ranker.queryTemplate ? TemplateRenderBlockActionExecutionPayload.toRequestPayload(ranker.queryTemplate) : ranker.queryTemplate,
      ranker_id: ranker.rankerId,
      ranker_type: ranker.rankerType,
    };
  }
}

export default RankerActionExecutionPayload;
