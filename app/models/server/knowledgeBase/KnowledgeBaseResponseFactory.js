import { KnowledgeBaseConstant } from '~/constants';
import KnowledgeBaseResponse from './KnowledgeBaseResponse';
import VectorStoreKnowledgeBaseResponse from './VectorStoreKnowledgeBaseResponse';

class KnowledgeBaseResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.knowledge_base_type
   */
  static create(payload) {
    switch (payload.knowledge_base_type) {
      case KnowledgeBaseConstant.Type.VECTOR_STORE.value:
        return new VectorStoreKnowledgeBaseResponse(payload);
      default:
        return new KnowledgeBaseResponse(payload);
    }
  }
}

export default KnowledgeBaseResponseFactory;
