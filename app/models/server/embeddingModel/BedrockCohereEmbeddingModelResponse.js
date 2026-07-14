import BedrockCohereEmbeddingModel from './BedrockCohereEmbeddingModel';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class BedrockCohereEmbeddingModelResponse extends BedrockCohereEmbeddingModel {
  constructor({
    embedding_model_id,
    embedding_model_name,
    embedding_model_type,
    embedding_type,
    input_type,
    max_tokens,
    model,
    output_dimension,
    region,
    status,
    system_info,
    truncate,
    updated_ts,
  } = {}) {
    super({
      embeddingModelId: embedding_model_id,
      embeddingModelName: embedding_model_name,
      embeddingModelType: embedding_model_type,
      embeddingType: embedding_type,
      inputType: input_type,
      maxTokens: max_tokens,
      model,
      outputDimension: output_dimension,
      region,
      status,
      systemInfo: system_info,
      truncate,
      updatedTs: updated_ts,
    });
  }
}

export default BedrockCohereEmbeddingModelResponse;
