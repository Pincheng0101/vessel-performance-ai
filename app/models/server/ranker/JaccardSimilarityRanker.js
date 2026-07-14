import { RankerConstant } from '~/constants';
import Ranker from './Ranker';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class JaccardSimilarityRanker extends Ranker {
  constructor({
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
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {JaccardSimilarityRanker} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
    };
  }
}

export default JaccardSimilarityRanker;
