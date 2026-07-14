import EmbeddingModelResponseFactory from './EmbeddingModelResponseFactory';

/**
 * @import { EmbeddingModelResponse } from '~/models/server/chunker'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class EmbeddingModelListResponse {
  /**
   * @type {EmbeddingModelResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.embedding_models.map(EmbeddingModelResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default EmbeddingModelListResponse;
