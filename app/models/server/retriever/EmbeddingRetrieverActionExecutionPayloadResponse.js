import { EmbeddingModelResponseFactory } from '~/models/server/embeddingModel';
import { TemplateRenderBlockActionExecutionPayloadResponse } from '~/models/server/templateRenderBlock';
import RetrieverActionExecutionPayloadResponse from './RetrieverActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class EmbeddingRetrieverActionExecutionPayloadResponse extends RetrieverActionExecutionPayloadResponse {
  constructor({
    embedding,
    field_mappings,
    filter_query,
    knowledge_base_id,
    limit,
    query_string,
    query_template,
    retriever_id,
    retriever_type,
  } = {}) {
    super({
      field_mappings,
      filter_query,
      knowledge_base_id,
      limit,
      query_string,
      retriever_id,
      retriever_type,
    });
    this.embedding = embedding ? EmbeddingModelResponseFactory.create(embedding) : embedding;
    this.queryTemplate = query_template ? new TemplateRenderBlockActionExecutionPayloadResponse(query_template) : query_template;
  };
}

export default EmbeddingRetrieverActionExecutionPayloadResponse;
