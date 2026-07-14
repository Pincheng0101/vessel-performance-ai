import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class EmbeddingModel extends Resource {
  constructor({
    embeddingModelId,
    embeddingModelName,
    embeddingModelType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.embeddingModelId = embeddingModelId ?? '';
    this.embeddingModelName = embeddingModelName ?? '';
    this.embeddingModelType = embeddingModelType ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.EMBEDDING_MODEL.value;
  }

  get id() {
    return this.embeddingModelId;
  }

  get name() {
    return this.embeddingModelName;
  }

  get type() {
    return this.embeddingModelType;
  }

  /**
   * @param {EmbeddingModel} resource
   */
  static toRequestPayload(resource) {
    return {
      embedding_model_id: resource.embeddingModelId,
      embedding_model_name: resource.embeddingModelName,
      embedding_model_type: resource.embeddingModelType,
    };
  }
}

export default EmbeddingModel;
