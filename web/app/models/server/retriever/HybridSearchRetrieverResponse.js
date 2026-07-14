import HybridSearchRetriever from './HybridSearchRetriever';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class HybridSearchRetrieverResponse extends HybridSearchRetriever {
  constructor({
    combination_technique,
    embedding_model_id,
    embedding_weight,
    filter_query,
    keyword_weight,
    normalization_technique,
    retriever_id,
    retriever_name,
    retriever_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      combinationTechnique: combination_technique,
      embeddingModelId: embedding_model_id,
      embeddingWeight: embedding_weight,
      filterQuery: filter_query,
      keywordWeight: keyword_weight,
      normalizationTechnique: normalization_technique,
      retrieverId: retriever_id,
      retrieverName: retriever_name,
      retrieverType: retriever_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default HybridSearchRetrieverResponse;
