import JaccardSimilarityRanker from './JaccardSimilarityRanker';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class JaccardSimilarityRankerResponse extends JaccardSimilarityRanker {
  constructor({
    ranker_id,
    ranker_name,
    ranker_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      rankerId: ranker_id,
      rankerName: ranker_name,
      rankerType: ranker_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default JaccardSimilarityRankerResponse;
