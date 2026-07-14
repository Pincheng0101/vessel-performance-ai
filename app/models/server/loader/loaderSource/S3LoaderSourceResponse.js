import LoaderSourceAugmentedFieldResponseFactory from './LoaderSourceAugmentedFieldResponseFactory';
import LoaderSourceDataFieldResponse from './LoaderSourceDataFieldResponse';
import S3LoaderSource from './S3LoaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class S3LoaderSourceResponse extends S3LoaderSource {
  constructor({
    augmented_fields_after_chunking,
    augmented_fields_before_chunking,
    chunker_id,
    chunking_template,
    connector_id,
    data_fields,
    file_extension,
    file_extensions,
    retriever_template,
    s3_bucket,
    s3_prefix,
    source_type,
  } = {}) {
    super({
      augmentedFieldsAfterChunking: augmented_fields_after_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      augmentedFieldsBeforeChunking: augmented_fields_before_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      chunkerId: chunker_id,
      chunkingTemplate: chunking_template,
      connectorId: connector_id,
      dataFields: data_fields?.map(field => new LoaderSourceDataFieldResponse(field)),
      fileExtension: file_extension,
      fileExtensions: file_extensions,
      retrieverTemplate: retriever_template,
      s3Bucket: s3_bucket,
      s3Prefix: s3_prefix,
      sourceType: source_type,
    });
  }
}

export default S3LoaderSourceResponse;
