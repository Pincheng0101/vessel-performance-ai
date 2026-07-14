import { RetrieverConstant } from '~/constants';
import EmbeddingRetriever from './EmbeddingRetriever';
import HybridSearchRetriever from './HybridSearchRetriever';
import KeywordRetriever from './KeywordRetriever';
import Retriever from './Retriever';

class RetrieverFactory {
  /**
   * @param {Retriever} payload
   */
  static create(payload) {
    switch (payload.retrieverType) {
      case RetrieverConstant.Type.EMBEDDING.value:
        return new EmbeddingRetriever(payload);
      case RetrieverConstant.Type.KEYWORD.value:
        return new KeywordRetriever(payload);
      case RetrieverConstant.Type.HYBRID_SEARCH.value:
        return new HybridSearchRetriever(payload);
      default:
        return new Retriever(payload);
    }
  }

  /**
   * @param {Retriever} resource
   */
  static toRequestPayload(resource) {
    switch (resource.retrieverType) {
      case RetrieverConstant.Type.EMBEDDING.value:
        return EmbeddingRetriever.toRequestPayload(resource);
      case RetrieverConstant.Type.KEYWORD.value:
        return KeywordRetriever.toRequestPayload(resource);
      case RetrieverConstant.Type.HYBRID_SEARCH.value:
        return HybridSearchRetriever.toRequestPayload(resource);
      default:
        return Retriever.toRequestPayload(resource);
    }
  }
}

export default RetrieverFactory;
