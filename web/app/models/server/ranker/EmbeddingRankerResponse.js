import EmbeddingRanker from './EmbeddingRanker';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class EmbeddingRankerResponse extends EmbeddingRanker {
  constructor({
    embedding_model_id,
    ranker_id,
    ranker_name,
    ranker_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      embeddingModelId: embedding_model_id,
      rankerId: ranker_id,
      rankerName: ranker_name,
      rankerType: ranker_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default EmbeddingRankerResponse;
