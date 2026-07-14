import { RetrieverConstant } from '~/constants';
import EmbeddingRetrieverActionExecutionPayload from './EmbeddingRetrieverActionExecutionPayload';
import HybridSearchRetrieverActionExecutionPayload from './HybridSearchRetrieverActionExecutionPayload';
import KeywordRetrieverActionExecutionPayload from './KeywordRetrieverActionExecutionPayload';
import RetrieverActionExecutionPayload from './RetrieverActionExecutionPayload';

class RetrieverActionExecutionPayloadFactory {
  /**
   * @param {RetrieverActionExecutionPayload} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.retrieverType) {
      case RetrieverConstant.Type.EMBEDDING.value:
        return new EmbeddingRetrieverActionExecutionPayload(payload);
      case RetrieverConstant.Type.KEYWORD.value:
        return new KeywordRetrieverActionExecutionPayload(payload);
      case RetrieverConstant.Type.HYBRID_SEARCH.value:
        return new HybridSearchRetrieverActionExecutionPayload(payload);
      default:
        return new RetrieverActionExecutionPayload(payload);
    }
  }

  /**
   * @param {RetrieverActionExecutionPayload} retriever
   */
  static toRequestPayload(retriever) {
    switch (retriever.retrieverType) {
      case RetrieverConstant.Type.EMBEDDING.value:
        return EmbeddingRetrieverActionExecutionPayload.toRequestPayload(retriever);
      case RetrieverConstant.Type.KEYWORD.value:
        return KeywordRetrieverActionExecutionPayload.toRequestPayload(retriever);
      case RetrieverConstant.Type.HYBRID_SEARCH.value:
        return HybridSearchRetrieverActionExecutionPayload.toRequestPayload(retriever);
      default:
        return RetrieverActionExecutionPayload.toRequestPayload(retriever);
    }
  }
}

export default RetrieverActionExecutionPayloadFactory;
