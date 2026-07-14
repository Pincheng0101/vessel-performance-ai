import { EmbeddingModelFactory } from '~/models/server/embeddingModel';
import TemplateRenderBlockActionExecutionPayload from '~/models/server/templateRenderBlock/TemplateRenderBlockActionExecutionPayload';
import RetrieverActionExecutionPayload from './RetrieverActionExecutionPayload';

class EmbeddingRetrieverActionExecutionPayload extends RetrieverActionExecutionPayload {
  constructor({
    embedding,
    fieldMappings,
    filterQuery,
    knowledgeBaseId,
    limit,
    queryString,
    queryTemplate,
    retrieverId,
    retrieverType,
  } = {}) {
    super({
      fieldMappings,
      filterQuery,
      knowledgeBaseId,
      limit,
      queryString,
      retrieverId,
      retrieverType,
    });
    this.embedding = embedding ? EmbeddingModelFactory.create(embedding) : embedding;
    this.queryTemplate = queryTemplate ? new TemplateRenderBlockActionExecutionPayload(queryTemplate) : queryTemplate;
  };

  /**
   * @param {EmbeddingRetrieverActionExecutionPayload} retriever
   */
  static toRequestPayload(retriever) {
    return {
      ...super.toRequestPayload(retriever),
      embedding: retriever.embedding ? EmbeddingModelFactory.toRequestPayload(retriever.embedding) : retriever.embedding,
      query_template: retriever.queryTemplate ? TemplateRenderBlockActionExecutionPayload.toRequestPayload(retriever.queryTemplate) : retriever.queryTemplate,
    };
  }
}

export default EmbeddingRetrieverActionExecutionPayload;
