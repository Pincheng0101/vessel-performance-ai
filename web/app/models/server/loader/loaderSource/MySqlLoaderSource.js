import LoaderSource from './LoaderSource';
import LoaderSourceAugmentedFieldFactory from './LoaderSourceAugmentedFieldFactory';

class MySqlLoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    augmentedFieldsBeforeChunking,
    chunkerId,
    chunkingTemplate,
    connectorId,
    databaseName,
    dataFields,
    lastModifiedTsField,
    retrieverTemplate,
    sourceType,
    tableName,
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
    this.databaseName = databaseName;
    this.lastModifiedTsField = lastModifiedTsField;
    this.tableName = tableName;
  }

  /**
   * @param {MySqlLoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      augmented_fields_before_chunking: resource.augmentedFieldsBeforeChunking?.map(LoaderSourceAugmentedFieldFactory.toRequestPayload),
      chunker_id: resource.chunkerId,
      chunking_template: resource.chunkingTemplate,
      connector_id: resource.connectorId,
      database_name: resource.databaseName,
      last_modified_ts_field: resource.lastModifiedTsField,
      table_name: resource.tableName,
    };
  }
}

export default MySqlLoaderSource;
