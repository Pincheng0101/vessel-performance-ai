import LoaderSourceAugmentedFieldResponseFactory from './LoaderSourceAugmentedFieldResponseFactory';
import LoaderSourceDataFieldResponse from './LoaderSourceDataFieldResponse';
import StorageUnsupervisedLoaderSource from './StorageUnsupervisedLoaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageUnsupervisedLoaderSourceResponse extends StorageUnsupervisedLoaderSource {
  constructor({
    augmented_fields_after_chunking,
    common_prefix,
    data_fields,
    file_extension,
    file_extensions,
    llm_id,
    retriever_template,
    source_type,
    storage_id,
  } = {}) {
    super({
      augmentedFieldsAfterChunking: augmented_fields_after_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      commonPrefix: common_prefix,
      dataFields: data_fields?.map(field => new LoaderSourceDataFieldResponse(field)),
      fileExtension: file_extension,
      fileExtensions: file_extensions,
      llmId: llm_id,
      retrieverTemplate: retriever_template,
      sourceType: source_type,
      storageId: storage_id,
    });
  }
}

export default StorageUnsupervisedLoaderSourceResponse;
