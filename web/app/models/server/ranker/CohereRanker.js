import { AwsConstant, RankerConstant } from '~/constants';
import Ranker from './Ranker';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class CohereRanker extends Ranker {
  constructor({
    modelId,
    rankerId,
    rankerName,
    rankerType,
    region,
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
    this.modelId = modelId ?? RankerConstant.CohereModel.COHERE_RERANK_V3_5.value;
    this.region = region ?? '';
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
      { title: $i18n.t('__fieldModel'), value: findField(RankerConstant.CohereModel, this.modelId, 'title') },
      { title: $i18n.t('__fieldRegion'), value: findField(AwsConstant.Region, this.region, 'title') },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {CohereRanker} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      model_id: resource.modelId,
      region: resource.region,
    };
  }
}

export default CohereRanker;
