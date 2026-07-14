import { RankerConstant } from '~/constants';
import RankerActionExecutionPayload from './RankerActionExecutionPayload';

class EmbeddingRankerActionExecutionPayload extends RankerActionExecutionPayload {
  constructor({
    contentTemplate,
    docs,
    limit,
    queryString,
    queryTemplate,
    rankerId,
    rankerType,
    threshold,
  } = {}) {
    super({
      docs,
      limit,
      queryString,
      queryTemplate,
      rankerId,
      rankerType,
    });
    this.contentTemplate = contentTemplate ?? '';
    this.threshold = threshold ?? RankerConstant.ActionExecutionParams.RANKER_THRESHOLD.default;
  }

  /**
   * @param {EmbeddingRankerActionExecutionPayload} ranker
   */
  static toRequestPayload(ranker) {
    return {
      ...super.toRequestPayload(ranker),
      content_template: ranker.contentTemplate,
      threshold: ranker.threshold,
    };
  }
}

export default EmbeddingRankerActionExecutionPayload;
