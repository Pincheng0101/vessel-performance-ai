import LoaderSource from './LoaderSource';
import LoaderSourceAugmentedFieldFactory from './LoaderSourceAugmentedFieldFactory';

class S3LoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    augmentedFieldsBeforeChunking,
    chunkerId,
    chunkingTemplate,
    connectorId,
    dataFields,
    fileExtension,
    fileExtensions,
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
    this.augmentedFieldsBeforeChunking = augmentedFieldsBeforeChunking;
    this.chunkerId = chunkerId;
    this.chunkingTemplate = chunkingTemplate;
    this.connectorId = connectorId;
    this.fileExtensions = (() => {
      const resolvedFileExtensions = arrUtils.deduplicate([fileExtension, ...(fileExtensions ?? [])].filter(Boolean));
      return resolvedFileExtensions.length > 0 ? resolvedFileExtensions : null;
    })();
    this.s3Bucket = s3Bucket;
    this.s3Prefix = s3Prefix;
  }

  /**
   * @param {S3LoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      augmented_fields_before_chunking: resource.augmentedFieldsBeforeChunking?.map(LoaderSourceAugmentedFieldFactory.toRequestPayload),
      chunker_id: resource.chunkerId,
      chunking_template: resource.chunkingTemplate,
      connector_id: resource.connectorId,
      file_extensions: resource.fileExtensions,
      s3_bucket: resource.s3Bucket,
      s3_prefix: resource.s3Prefix,
    };
  }
}

export default S3LoaderSource;
