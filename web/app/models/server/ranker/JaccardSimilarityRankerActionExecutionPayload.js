import { RankerConstant } from '~/constants';
import RankerActionExecutionPayload from './RankerActionExecutionPayload';

class JaccardSimilarityRankerActionExecutionPayload extends RankerActionExecutionPayload {
  constructor({
    docs,
    limit,
    queryString,
    queryTemplate,
    rankerId,
    rankerType,
    rankingFields,
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
    this.rankingFields = rankingFields ?? [];
    this.threshold = threshold ?? RankerConstant.ActionExecutionParams.RANKER_THRESHOLD.default;
  };

  /**
   * @param {JaccardSimilarityRankerActionExecutionPayload} ranker
   */
  static toRequestPayload(ranker) {
    return {
      ...super.toRequestPayload(ranker),
      ranking_fields: ranker.rankingFields,
      threshold: ranker.threshold,
    };
  }
}

export default JaccardSimilarityRankerActionExecutionPayload;
