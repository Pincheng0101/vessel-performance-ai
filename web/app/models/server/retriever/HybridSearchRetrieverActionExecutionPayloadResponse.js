import HybridSearchRetrieverActionExecutionPayload from './HybridSearchRetrieverActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class HybridSearchRetrieverActionExecutionPayloadResponse extends HybridSearchRetrieverActionExecutionPayload {
  constructor({
    combination_technique,
    embedding_weight,
    field_mappings,
    filter_query,
    keyword_subquery,
    keyword_weight,
    knowledge_base_id,
    limit,
    normalization_technique,
    query_strings,
    retriever_id,
    retriever_type,
  } = {}) {
    super({
      combinationTechnique: combination_technique,
      embeddingWeight: embedding_weight,
      fieldMappings: field_mappings,
      filterQuery: filter_query,
      keywordSubquery: keyword_subquery,
      keywordWeight: keyword_weight,
      knowledgeBaseId: knowledge_base_id,
      limit,
      normalizationTechnique: normalization_technique,
      queryStrings: query_strings,
      retrieverId: retriever_id,
      retrieverType: retriever_type,
    });
  };
}

export default HybridSearchRetrieverActionExecutionPayloadResponse;
