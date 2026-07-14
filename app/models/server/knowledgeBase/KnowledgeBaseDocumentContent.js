class KnowledgeBaseDocumentContent {
  constructor({
    dataObjectId,
    updatedTs,
    retrieverChunk,
    lfeS3Uri,
    lfeFilename,
  } = {}) {
    this.dataObjectId = dataObjectId ?? '';
    this.updatedTs = updatedTs ?? 0;
    this.retrieverChunk = retrieverChunk ?? '';
    this.lfeS3Uri = lfeS3Uri ?? null;
    this.lfeFilename = lfeFilename ?? null;
  }
}

export default KnowledgeBaseDocumentContent;
