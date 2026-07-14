import { EmbeddingModelConstant } from '~/constants';
import BedrockCohereEmbeddingModel from './BedrockCohereEmbeddingModel';
import EmbeddingModel from './EmbeddingModel';

class EmbeddingModelFactory {
  /**
   * @param {EmbeddingModel} payload
   */
  static create(payload) {
    switch (payload.embeddingModelType) {
      case EmbeddingModelConstant.Type.BEDROCK_COHERE.value:
        return new BedrockCohereEmbeddingModel(payload);
      default:
        return new EmbeddingModel(payload);
    }
  }

  /**
   * @param {EmbeddingModel} resource
   */
  static toRequestPayload(resource) {
    switch (resource.embeddingModelType) {
      case EmbeddingModelConstant.Type.BEDROCK_COHERE.value:
        return BedrockCohereEmbeddingModel.toRequestPayload(resource);
      default:
        return EmbeddingModel.toRequestPayload(resource);
    }
  }
}

export default EmbeddingModelFactory;
