import LoaderSource from './LoaderSource';

class StorageUnsupervisedLoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    commonPrefix,
    dataFields,
    fileExtension,
    fileExtensions,
    llmId,
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
    this.commonPrefix = commonPrefix;
    this.fileExtensions = (() => {
      const resolvedFileExtensions = arrUtils.deduplicate([fileExtension, ...(fileExtensions ?? [])].filter(Boolean));
      return resolvedFileExtensions.length > 0 ? resolvedFileExtensions : null;
    })();
    this.llmId = llmId;
    this.storageId = storageId;
  }

  /**
   * @param {StorageUnsupervisedLoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      common_prefix: resource.commonPrefix,
      file_extensions: resource.fileExtensions,
      llm_id: resource.llmId,
      storage_id: resource.storageId,
    };
  }
}

export default StorageUnsupervisedLoaderSource;
