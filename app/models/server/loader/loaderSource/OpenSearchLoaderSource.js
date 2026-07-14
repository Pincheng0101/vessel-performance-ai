import LoaderSource from './LoaderSource';
import LoaderSourceAugmentedFieldFactory from './LoaderSourceAugmentedFieldFactory';

class OpenSearchLoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    augmentedFieldsBeforeChunking,
    chunkerId,
    chunkingTemplate,
    connectorId,
    dataFields,
    indexName,
    lastModifiedTsField,
    retrieverTemplate,
    sourceType,
  } = {}) {
    super({
      augmentedFieldsAfterChunking,
      dataFields,
      retrieverTemplate,
      sourceType,
    });
    this.augmentedFieldsBeforeChunking = augmentedFieldsBeforeChunking;
    this.chunkerId = chunkerId;
    this.chunkingTemplate = chunkingTemplate;
    this.connectorId = connectorId;
    this.indexName = indexName;
    this.lastModifiedTsField = lastModifiedTsField;
  }

  /**
   * @param {OpenSearchLoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      augmented_fields_before_chunking: resource.augmentedFieldsBeforeChunking?.map(LoaderSourceAugmentedFieldFactory.toRequestPayload),
      chunker_id: resource.chunkerId,
      chunking_template: resource.chunkingTemplate,
      connector_id: resource.connectorId,
      index_name: resource.indexName,
      last_modified_ts_field: resource.lastModifiedTsField,
    };
  }
}

export default OpenSearchLoaderSource;
