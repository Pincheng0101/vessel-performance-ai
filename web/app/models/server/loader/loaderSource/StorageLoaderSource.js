import LoaderSource from './LoaderSource';
import LoaderSourceAugmentedFieldFactory from './LoaderSourceAugmentedFieldFactory';

class StorageLoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    augmentedFieldsBeforeChunking,
    chunkerId,
    chunkingTemplate,
    commonPrefix,
    dataFields,
    fileExtension,
    fileExtensions,
    retrieverTemplate,
    sourceType,
    storageId,
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
    this.commonPrefix = commonPrefix;
    this.fileExtensions = (() => {
      const resolvedFileExtensions = arrUtils.deduplicate([fileExtension, ...(fileExtensions ?? [])].filter(Boolean));
      return resolvedFileExtensions.length > 0 ? resolvedFileExtensions : null;
    })();
    this.storageId = storageId;
  }

  /**
   * @param {StorageLoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      augmented_fields_before_chunking: resource.augmentedFieldsBeforeChunking?.map(LoaderSourceAugmentedFieldFactory.toRequestPayload),
      chunker_id: resource.chunkerId,
      chunking_template: resource.chunkingTemplate,
      common_prefix: resource.commonPrefix,
      file_extensions: resource.fileExtensions,
      storage_id: resource.storageId,
    };
  }
}

export default StorageLoaderSource;
