import LoaderSource from './LoaderSource';
import LoaderSourceAugmentedFieldResponseFactory from './LoaderSourceAugmentedFieldResponseFactory';
import LoaderSourceDataFieldResponse from './LoaderSourceDataFieldResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LoaderSourceResponse extends LoaderSource {
  constructor({
    augmented_fields_after_chunking,
    connector_id,
    data_fields,
    retriever_template,
    source_type,
  } = {}) {
    super({
      augmentedFieldsAfterChunking: augmented_fields_after_chunking?.map(LoaderSourceAugmentedFieldResponseFactory.create),
      connectorId: connector_id,
      dataFields: data_fields?.map(field => new LoaderSourceDataFieldResponse(field)),
      retrieverTemplate: retriever_template,
      sourceType: source_type,
    });
  }
}

export default LoaderSourceResponse;
