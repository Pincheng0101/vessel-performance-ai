import LoaderSourceAugmentedFieldResponseFactory from './LoaderSourceAugmentedFieldResponseFactory';
import LoaderSourceDataFieldResponse from './LoaderSourceDataFieldResponse';
import StorageLoaderSource from './StorageLoaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageLoaderSourceResponse extends StorageLoaderSource {
  constructor({
    augmented_fields_after_chunking,
    augmented_fields_before_chunking,
    chunker_id,
    chunking_template,
    common_prefix,
    data_fields,
    file_extension,
    file_extensions,
    retriever_template,
    source_type,
    storage_id,
  } = {}) {
    super({
      augmentedFieldsAfterChunking: augmented_fields_after_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      augmentedFieldsBeforeChunking: augmented_fields_before_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      chunkerId: chunker_id,
      chunkingTemplate: chunking_template,
      commonPrefix: common_prefix,
      dataFields: data_fields?.map(field => new LoaderSourceDataFieldResponse(field)),
      fileExtension: file_extension,
      fileExtensions: file_extensions,
      retrieverTemplate: retriever_template,
      sourceType: source_type,
      storageId: storage_id,
    });
  }
}

export default StorageLoaderSourceResponse;
