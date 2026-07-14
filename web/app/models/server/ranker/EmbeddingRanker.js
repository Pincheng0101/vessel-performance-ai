import { RankerConstant, ResourceConstant } from '~/constants';
import Ranker from './Ranker';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class EmbeddingRanker extends Ranker {
  constructor({
    embeddingModelId,
    rankerId,
    rankerName,
    rankerType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      rankerId,
      rankerName,
      rankerType,
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
      { title: $i18n.t('__fieldType'), value: findField(RankerConstant.Type, this.type, 'title'), iconPath: findField(RankerConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldEmbeddingModelId'), value: this.embeddingModelId, isCopyable: true, link: { href: resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, this.embeddingModelId) } },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {EmbeddingRanker} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      embedding_model_id: resource.embeddingModelId,
    };
  }
}

export default EmbeddingRanker;
