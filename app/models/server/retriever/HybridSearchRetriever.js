import { ResourceConstant, RetrieverConstant } from '~/constants';
import Retriever from './Retriever';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class HybridSearchRetriever extends Retriever {
  constructor({
    combinationTechnique,
    embeddingModelId,
    embeddingWeight,
    filterQuery,
    keywordWeight,
    normalizationTechnique,
    retrieverId,
    retrieverName,
    retrieverType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      filterQuery,
      retrieverId,
      retrieverName,
      retrieverType,
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.embeddingModelId = embeddingModelId ?? '';
    this.keywordWeight = keywordWeight ?? RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.default;
    this.embeddingWeight = embeddingWeight ?? RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.default;
    this.normalizationTechnique = normalizationTechnique ?? RetrieverConstant.HybridSearchParams.NORMALIZATION_TECHNIQUE.default;
    this.combinationTechnique = combinationTechnique ?? RetrieverConstant.HybridSearchParams.COMBINATION_TECHNIQUE.default;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldFilterQuery'), value: this.filterQuery, isJsonCode: true },
      { title: $i18n.t('__fieldType'), value: findField(RetrieverConstant.Type, this.type, 'title'), iconPath: findField(RetrieverConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldEmbeddingModelId'), value: this.embeddingModelId, isCopyable: true, link: { href: resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, this.embeddingModelId) } },
      { title: $i18n.t('__fieldRetrieverHybridSearchKeywordWeight'), value: this.keywordWeight },
      { title: $i18n.t('__fieldRetrieverHybridSearchEmbeddingWeight'), value: this.embeddingWeight },
      { title: $i18n.t('__fieldRetrieverHybridSearchNormalizationTechnique'), value: $i18n.t(findField(RetrieverConstant.HybridSearchNormalizationTechnique, this.normalizationTechnique, 'i18nTitle')) },
      { title: $i18n.t('__fieldRetrieverHybridSearchCombinationTechnique'), value: $i18n.t(findField(RetrieverConstant.HybridSearchCombinationTechnique, this.combinationTechnique, 'i18nTitle')) },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {HybridSearchRetriever} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      embedding_model_id: resource.embeddingModelId,
      keyword_weight: resource.keywordWeight,
      embedding_weight: resource.embeddingWeight,
      normalization_technique: resource.normalizationTechnique,
      combination_technique: resource.combinationTechnique,
      filter_query: resource.filterQuery,
    };
  }
}

export default HybridSearchRetriever;
