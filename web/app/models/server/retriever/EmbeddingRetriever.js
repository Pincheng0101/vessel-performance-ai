import { ResourceConstant, RetrieverConstant } from '~/constants';
import Retriever from './Retriever';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class EmbeddingRetriever extends Retriever {
  constructor({
    embeddingModelId,
    filterQuery,
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
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {EmbeddingRetriever} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      embedding_model_id: resource.embeddingModelId,
      filter_query: resource.filterQuery,
    };
  }
}

export default EmbeddingRetriever;
