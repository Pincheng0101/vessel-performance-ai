import { KnowledgeBaseConstant } from '~/constants';
import KnowledgeBase from './KnowledgeBase';
import VectorStoreKnowledgeBase from './VectorStoreKnowledgeBase';

class KnowledgeBaseFactory {
  /**
   * @param {KnowledgeBase} payload
   */
  static create(payload) {
    switch (payload.knowledgeBaseType) {
      case KnowledgeBaseConstant.Type.VECTOR_STORE.value:
        return new VectorStoreKnowledgeBase(payload);
      default:
        return new KnowledgeBase(payload);
    }
  }

  /**
   * @param {KnowledgeBase} resource
   */
  static toRequestPayload(resource) {
    switch (resource.knowledgeBaseType) {
      case KnowledgeBaseConstant.Type.VECTOR_STORE.value:
        return VectorStoreKnowledgeBase.toRequestPayload(resource);
      default:
        return KnowledgeBase.toRequestPayload(resource);
    }
  }
}

export default KnowledgeBaseFactory;
