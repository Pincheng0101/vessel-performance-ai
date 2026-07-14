import RankerActionExecutionPayload from './RankerActionExecutionPayload';

class CohereRankerActionExecutionPayload extends RankerActionExecutionPayload {
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
    this.rankingFields = rankingFields;
  }

  /**
   * @param {CohereRankerActionExecutionPayload} ranker
   */
  static toRequestPayload(ranker) {
    return {
      ...super.toRequestPayload(ranker),
      ranking_fields: ranker.rankingFields,
    };
  }
}

export default CohereRankerActionExecutionPayload;
