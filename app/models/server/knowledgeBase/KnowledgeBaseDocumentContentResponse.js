import KnowledgeBaseDocumentContent from './KnowledgeBaseDocumentContent';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class KnowledgeBaseDocumentContentResponse extends KnowledgeBaseDocumentContent {
  constructor({
    data_object_id,
    lfe_filename,
    lfe_s3_uri,
    retriever_chunk,
    updated_ts,
  } = {}) {
    super({
      dataObjectId: data_object_id,
      lfeFilename: lfe_filename,
      lfeS3Uri: lfe_s3_uri,
      retrieverChunk: retriever_chunk,
      updatedTs: updated_ts,
    });
  }
}

export default KnowledgeBaseDocumentContentResponse;
