import { ConnectorConstant, KnowledgeBaseConstant, LlmConstant, LoaderConstant, ResourceConstant, RetrieverConstant, StorageConstant } from '~/constants';
import Loader from './Loader';
import { LoaderSourceAugmentedField } from './loaderSource';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class UnsupervisedLoader extends Loader {
  constructor({
    cron,
    knowledgeBaseId,
    loaderId,
    loaderName,
    loaderType,
    parserMode,
    retrieverIds,
    sources,
    status,
    systemInfo,
    updatedTs,
    _resourceMap,
  } = {}) {
    super({
      cron,
      knowledgeBaseId,
      loaderId,
      loaderName,
      loaderType,
      retrieverIds,
      sources,
      status,
      systemInfo,
      updatedTs,
      _resourceMap,
    });
    this.parserMode = parserMode ?? LoaderConstant.ParserMode.FAST.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    const getResource = id => this._resourceMap[id];
    const knowledgeBase = getResource(this.knowledgeBaseId);
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: $i18n.t(findField(LoaderConstant.Type, this.type, 'i18nTitle')), iconPath: findField(LoaderConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldKnowledgeBase'), value: knowledgeBase?.name || this.knowledgeBaseId, iconPath: knowledgeBase ? findField(KnowledgeBaseConstant.Type, knowledgeBase.type, 'iconPath') : null, link: { href: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, this.knowledgeBaseId) } },
      {
        title: $i18n.t('__fieldRetriever', 2),
        value: this.retrieverIds?.map(id => getResource(id)?.name || id),
        iconPath: (_, index) => {
          const id = this.retrieverIds[index];
          const retriever = getResource(id);
          return retriever ? findField(RetrieverConstant.Type, retriever.type, 'iconPath') : null;
        },
        link: (_, index) => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, this.retrieverIds[index]) }),
      },
      { title: $i18n.t('__fieldParserMode'), value: $i18n.t(findField(LoaderConstant.ParserMode, this.parserMode, 'i18nTitle')) },
      { title: $i18n.t('__fieldSyncJob'), value: this.cron },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @returns {DisplayField[]}
   */
  get sourcesDisplayFields() {
    const { $i18n } = useNuxtApp();
    const { S3, STORAGE } = LoaderConstant.SourceType;
    const getResource = id => this._resourceMap[id];
    return [
      {
        title: `${$i18n.t('__fieldSource', 2)} - ${S3.title}`,
        value: this.sources.filter(source => source.type === S3.value),
        table: {
          headers: [
            { title: $i18n.t('__fieldType'), key: 'type', value: () => S3.title, iconPath: S3.iconPath },
            { title: $i18n.t('__fieldLlm'), key: 'llmId', value: item => getResource(item.llmId)?.name || item.llmId, iconPath: item => getResource(item.llmId) ? findField(LlmConstant.Type, getResource(item.llmId).type, 'iconPath') : null, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, item.llmId) }) },
            { title: $i18n.t('__fieldConnector'), key: 'connectorId', value: item => getResource(item.connectorId)?.name || item.connectorId, iconPath: item => getResource(item.connectorId) ? findField(ConnectorConstant.Type, getResource(item.connectorId).type, 'iconPath') : null, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId) }) },
            { title: $i18n.t('__fieldS3Bucket'), key: 's3Bucket' },
            { title: $i18n.t('__fieldS3Prefix'), key: 's3Prefix' },
            { title: $i18n.t('__fieldFileExtension', 2), key: 'fileExtensions', isChip: true },
            { title: $i18n.t('__fieldRetrieverTemplate'), key: 'retrieverTemplate', isJinjaCode: true, editorOptions: { maxLines: 5 } },
            { title: $i18n.t('__fieldDataField', 2), key: 'dataFields', isChip: true },
            { title: $i18n.t('__fieldAugmentedFieldAfterChunking', 2), key: 'augmentedFieldsAfterChunking', value: item => LoaderSourceAugmentedField.sanitize(item.augmentedFieldsAfterChunking), isJsonCode: true, editorOptions: { maxLines: 5 } },
          ],
        },
      },
      {
        title: `${$i18n.t('__fieldSource', 2)} - ${STORAGE.title}`,
        value: this.sources.filter(source => source.type === STORAGE.value),
        table: {
          headers: [
            { title: $i18n.t('__fieldType'), key: 'type', value: () => STORAGE.title, iconPath: STORAGE.iconPath },
            { title: $i18n.t('__fieldLlm'), key: 'llmId', value: item => getResource(item.llmId)?.name || item.llmId, iconPath: item => getResource(item.llmId) ? findField(LlmConstant.Type, getResource(item.llmId).type, 'iconPath') : null, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, item.llmId) }) },
            { title: $i18n.t('__fieldStorage'), key: 'storageId', value: item => getResource(item.storageId)?.name || item.storageId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.storageId) }), iconPath: StorageConstant.Type.STORAGE.iconPath },
            { title: $i18n.t('__fieldFolder'), key: 'commonPrefix' },
            { title: $i18n.t('__fieldFileExtension', 2), key: 'fileExtensions', isChip: true },
            { title: $i18n.t('__fieldRetrieverTemplate'), key: 'retrieverTemplate', isJinjaCode: true, editorOptions: { maxLines: 5 } },
            { title: $i18n.t('__fieldDataField', 2), key: 'dataFields', isChip: true },
            { title: $i18n.t('__fieldAugmentedFieldAfterChunking', 2), key: 'augmentedFieldsAfterChunking', isJsonCode: true, editorOptions: { maxLines: 5 } },
          ],
        },
      },
    ].filter(item => item.value.length > 0);
  }

  /**
   * @param {UnsupervisedLoader} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      parser_mode: resource.parserMode ?? LoaderConstant.ParserMode.FAST.value,
    };
  }
}

export default UnsupervisedLoader;
