import LoaderSourceAugmentedFieldResponseFactory from './LoaderSourceAugmentedFieldResponseFactory';
import LoaderSourceDataFieldResponse from './LoaderSourceDataFieldResponse';
import S3UnsupervisedLoaderSource from './S3UnsupervisedLoaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class S3UnsupervisedLoaderSourceResponse extends S3UnsupervisedLoaderSource {
  constructor({
    augmented_fields_after_chunking,
    connector_id,
    data_fields,
    file_extension,
    file_extensions,
    llm_id,
    retriever_template,
    s3_bucket,
    s3_prefix,
    source_type,
  } = {}) {
    super({
      augmentedFieldsAfterChunking: augmented_fields_after_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      connectorId: connector_id,
      dataFields: data_fields?.map(field => new LoaderSourceDataFieldResponse(field)),
      fileExtension: file_extension,
      fileExtensions: file_extensions,
      llmId: llm_id,
      retrieverTemplate: retriever_template,
      s3Bucket: s3_bucket,
      s3Prefix: s3_prefix,
      sourceType: source_type,
    });
  }
}

export default S3UnsupervisedLoaderSourceResponse;
