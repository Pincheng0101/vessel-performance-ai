import { RetrieverConstant } from '~/constants';
import RetrieverActionExecutionPayload from './RetrieverActionExecutionPayload';

class HybridSearchRetrieverActionExecutionPayload extends RetrieverActionExecutionPayload {
  constructor({
    combinationTechnique,
    embeddingWeight,
    fieldMappings,
    filterQuery,
    keywordSubquery,
    keywordWeight,
    knowledgeBaseId,
    limit,
    normalizationTechnique,
    queryStrings,
    retrieverId,
    retrieverType,
  } = {}) {
    super({
      fieldMappings,
      filterQuery,
      knowledgeBaseId,
      limit,
      retrieverId,
      retrieverType,
    });
    this.queryStrings = queryStrings;
    this.keywordSubquery = keywordSubquery;
    this.keywordWeight = keywordWeight ?? RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.default;
    this.embeddingWeight = embeddingWeight ?? RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.default;
    this.normalizationTechnique = normalizationTechnique ?? RetrieverConstant.HybridSearchParams.NORMALIZATION_TECHNIQUE.default;
    this.combinationTechnique = combinationTechnique ?? RetrieverConstant.HybridSearchParams.COMBINATION_TECHNIQUE.default;
  };

  /**
   * @param {HybridSearchRetrieverActionExecutionPayload} retriever
   */
  static toRequestPayload(retriever) {
    return {
      ...RetrieverActionExecutionPayload.toRequestPayload(retriever),
      query_strings: retriever.queryStrings,
      keyword_subquery: retriever.keywordSubquery,
      keyword_weight: retriever.keywordWeight,
      embedding_weight: retriever.embeddingWeight,
      normalization_technique: retriever.normalizationTechnique,
      combination_technique: retriever.combinationTechnique,
    };
  }
}

export default HybridSearchRetrieverActionExecutionPayload;
