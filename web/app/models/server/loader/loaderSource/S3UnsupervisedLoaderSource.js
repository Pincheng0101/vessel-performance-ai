import LoaderSource from './LoaderSource';

class S3UnsupervisedLoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    connectorId,
    dataFields,
    fileExtension,
    fileExtensions,
    llmId,
    retrieverTemplate,
    s3Bucket,
    s3Prefix,
    sourceType,
  } = {}) {
    super({
      augmentedFieldsAfterChunking,
      dataFields,
      retrieverTemplate,
      sourceType,
    });
    this.connectorId = connectorId;
    this.fileExtensions = (() => {
      const resolvedFileExtensions = arrUtils.deduplicate([fileExtension, ...(fileExtensions ?? [])].filter(Boolean));
      return resolvedFileExtensions.length > 0 ? resolvedFileExtensions : null;
    })();
    this.llmId = llmId;
    this.s3Bucket = s3Bucket;
    this.s3Prefix = s3Prefix;
  }

  /**
   * @param {S3UnsupervisedLoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      connector_id: resource.connectorId,
      file_extensions: resource.fileExtensions,
      llm_id: resource.llmId,
      s3_bucket: resource.s3Bucket,
      s3_prefix: resource.s3Prefix,
    };
  }
}

export default S3UnsupervisedLoaderSource;
