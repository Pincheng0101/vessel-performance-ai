import CohereRanker from './CohereRanker';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class CohereRankerResponse extends CohereRanker {
  constructor({
    model_id,
    ranker_id,
    ranker_name,
    ranker_type,
    region,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      modelId: model_id,
      rankerId: ranker_id,
      rankerName: ranker_name,
      rankerType: ranker_type,
      region,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default CohereRankerResponse;
