import EmbeddingRetriever from './EmbeddingRetriever';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class EmbeddingRetrieverResponse extends EmbeddingRetriever {
  constructor({
    embedding_model_id,
    filter_query,
    retriever_id,
    retriever_name,
    retriever_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      embeddingModelId: embedding_model_id,
      filterQuery: filter_query,
      retrieverId: retriever_id,
      retrieverName: retriever_name,
      retrieverType: retriever_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default EmbeddingRetrieverResponse;
