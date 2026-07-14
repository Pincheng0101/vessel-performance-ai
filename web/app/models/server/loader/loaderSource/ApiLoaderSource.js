import LoaderSource from './LoaderSource';
import LoaderSourceAugmentedFieldFactory from './LoaderSourceAugmentedFieldFactory';

class ApiLoaderSource extends LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    augmentedFieldsBeforeChunking,
    chunkerId,
    chunkingTemplate,
    connectorId,
    dataFields,
    endpointUrl,
    retrieverTemplate,
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
    this.endpointUrl = endpointUrl;
  }

  /**
   * @param {ApiLoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      augmented_fields_before_chunking: resource.augmentedFieldsBeforeChunking?.map(LoaderSourceAugmentedFieldFactory.toRequestPayload),
      chunker_id: resource.chunkerId,
      chunking_template: resource.chunkingTemplate,
      connector_id: resource.connectorId,
      endpoint_url: resource.endpointUrl,
    };
  }
}

export default ApiLoaderSource;
