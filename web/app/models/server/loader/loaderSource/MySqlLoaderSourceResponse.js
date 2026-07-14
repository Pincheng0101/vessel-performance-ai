import LoaderSourceAugmentedFieldResponseFactory from './LoaderSourceAugmentedFieldResponseFactory';
import LoaderSourceDataFieldResponse from './LoaderSourceDataFieldResponse';
import MySqlLoaderSource from './MySqlLoaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MySqlLoaderSourceResponse extends MySqlLoaderSource {
  constructor({
    augmented_fields_after_chunking,
    augmented_fields_before_chunking,
    chunker_id,
    chunking_template,
    connector_id,
    data_fields,
    database_name,
    last_modified_ts_field,
    retriever_template,
    source_type,
    table_name,
  } = {}) {
    super({
      augmentedFieldsAfterChunking: augmented_fields_after_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      augmentedFieldsBeforeChunking: augmented_fields_before_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      chunkerId: chunker_id,
      chunkingTemplate: chunking_template,
      connectorId: connector_id,
      databaseName: database_name,
      dataFields: data_fields?.map(field => new LoaderSourceDataFieldResponse(field)),
      lastModifiedTsField: last_modified_ts_field,
      retrieverTemplate: retriever_template,
      sourceType: source_type,
      tableName: table_name,
    });
  }
}

export default MySqlLoaderSourceResponse;
