import RankerActionExecutionPayload from './RankerActionExecutionPayload';

class AmazonRankerActionExecutionPayload extends RankerActionExecutionPayload {
  constructor({
    docs,
    limit,
    queryString,
    queryTemplate,
    rankerId,
    rankerType,
    rankingFields,
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
  }

  /**
   * @param {AmazonRankerActionExecutionPayload} ranker
   */
  static toRequestPayload(ranker) {
    return {
      ...super.toRequestPayload(ranker),
      ranking_fields: ranker.rankingFields,
    };
  }
}

export default AmazonRankerActionExecutionPayload;
