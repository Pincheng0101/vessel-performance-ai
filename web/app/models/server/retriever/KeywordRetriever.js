import { RetrieverConstant } from '~/constants';
import Retriever from './Retriever';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class KeywordRetriever extends Retriever {
  constructor({
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
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {KeywordRetriever} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
    };
  }
}

export default KeywordRetriever;
