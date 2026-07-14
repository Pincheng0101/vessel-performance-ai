import KnowledgeBaseDocument from './KnowledgeBaseDocument';
import KnowledgeBaseDocumentContentResponse from './KnowledgeBaseDocumentContentResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class KnowledgeBaseDocumentResponse extends KnowledgeBaseDocument {
  constructor({
    doc_id,
    content,
    presigned_url,
  } = {}) {
    super({
      docId: doc_id,
      content: content ? new KnowledgeBaseDocumentContentResponse(content) : null,
      presignedUrl: presigned_url,
    });
  }
}

export default KnowledgeBaseDocumentResponse;
