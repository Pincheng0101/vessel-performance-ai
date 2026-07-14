import { RetrieverConstant } from '~/constants';
import EmbeddingRetrieverActionExecutionPayloadResponse from './EmbeddingRetrieverActionExecutionPayloadResponse';
import HybridSearchRetrieverActionExecutionPayloadResponse from './HybridSearchRetrieverActionExecutionPayloadResponse';
import KeywordRetrieverActionExecutionPayloadResponse from './KeywordRetrieverActionExecutionPayloadResponse';
import RetrieverActionExecutionPayloadResponse from './RetrieverActionExecutionPayloadResponse';

class RetrieverActionExecutionPayloadResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.retriever_type
   */
  static create(payload) {
    const normalized = referencePathUtils.removeSuffixes(payload);
    // Use ?. to handle a potential null payload
    switch (normalized?.retriever_type) {
      case RetrieverConstant.Type.EMBEDDING.value:
        return new EmbeddingRetrieverActionExecutionPayloadResponse(normalized);
      case RetrieverConstant.Type.KEYWORD.value:
        return new KeywordRetrieverActionExecutionPayloadResponse(normalized);
      case RetrieverConstant.Type.HYBRID_SEARCH.value:
        return new HybridSearchRetrieverActionExecutionPayloadResponse(normalized);
      default:
        return new RetrieverActionExecutionPayloadResponse(normalized);
    }
  }
}

export default RetrieverActionExecutionPayloadResponseFactory;
