import EmbeddingModel from './EmbeddingModel';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class EmbeddingModelResponse extends EmbeddingModel {
  constructor({
    embedding_model_id,
    embedding_model_name,
    embedding_model_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      embeddingModelId: embedding_model_id,
      embeddingModelName: embedding_model_name,
      embeddingModelType: embedding_model_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default EmbeddingModelResponse;
