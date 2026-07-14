import { KnowledgeBaseConstant, LoaderConstant, ResourceConstant } from '~/constants';
import KnowledgeBase from './KnowledgeBase';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class VectorStoreKnowledgeBase extends KnowledgeBase {
  constructor({
    dataFields,
    knowledgeBaseId,
    knowledgeBaseName,
    knowledgeBaseType,
    loaderId,
    opensearchIndexName,
    status,
    systemInfo,
    updatedTs,
    _resourceMap,
  } = {}) {
    super({
      dataFields,
      knowledgeBaseId,
      knowledgeBaseName,
      knowledgeBaseType,
      loaderId,
      opensearchIndexName,
      status,
      systemInfo,
      updatedTs,
      _resourceMap,
    });
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    const loader = this._resourceMap[this.loaderId];
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(KnowledgeBaseConstant.Type, this.type, 'title'), iconPath: findField(KnowledgeBaseConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldLoader'), value: loader?.name || this.loaderId, iconPath: loader ? findField(LoaderConstant.Type, loader.type, 'iconPath') : null, link: this.loaderId ? { href: resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, this.loaderId) } : null },
      { title: $i18n.t('__fieldOpenSearchIndexName'), value: this.id, isCopyable: true }, // Use id as stable index name
      { title: $i18n.t('__fieldDataField', 2), value: this.dataFields, isChip: true },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {VectorStoreKnowledgeBase} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
    };
  }
}

export default VectorStoreKnowledgeBase;
