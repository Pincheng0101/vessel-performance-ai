import { EmbeddingModelConstant } from '~/constants';
import BedrockCohereEmbeddingModelResponse from './BedrockCohereEmbeddingModelResponse';
import EmbeddingModelResponse from './EmbeddingModelResponse';

class EmbeddingModelResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.embedding_model_type
   */
  static create(payload) {
    switch (payload.embedding_model_type) {
      case EmbeddingModelConstant.Type.BEDROCK_COHERE.value:
        return new BedrockCohereEmbeddingModelResponse(payload);
      default:
        return new EmbeddingModelResponse(payload);
    }
  }
}

export default EmbeddingModelResponseFactory;
