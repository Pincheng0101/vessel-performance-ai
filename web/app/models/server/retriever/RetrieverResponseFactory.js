import { RetrieverConstant } from '~/constants';
import EmbeddingRetrieverResponse from './EmbeddingRetrieverResponse';
import HybridSearchRetrieverResponse from './HybridSearchRetrieverResponse';
import KeywordRetrieverResponse from './KeywordRetrieverResponse';
import RetrieverResponse from './RetrieverResponse';

class RetrieverResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.retriever_type
   */
  static create(payload) {
    switch (payload.retriever_type) {
      case RetrieverConstant.Type.EMBEDDING.value:
        return new EmbeddingRetrieverResponse(payload);
      case RetrieverConstant.Type.KEYWORD.value:
        return new KeywordRetrieverResponse(payload);
      case RetrieverConstant.Type.HYBRID_SEARCH.value:
        return new HybridSearchRetrieverResponse(payload);
      default:
        return new RetrieverResponse(payload);
    }
  }
}

export default RetrieverResponseFactory;
