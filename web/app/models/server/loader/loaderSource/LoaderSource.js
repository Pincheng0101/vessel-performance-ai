import LoaderSourceAugmentedFieldFactory from './LoaderSourceAugmentedFieldFactory';
import LoaderSourceDataField from './LoaderSourceDataField';

class LoaderSource {
  constructor({
    augmentedFieldsAfterChunking,
    dataFields,
    retrieverTemplate,
    sourceType,
  } = {}) {
    this.augmentedFieldsAfterChunking = augmentedFieldsAfterChunking;
    this.dataFields = dataFields?.map(field => new LoaderSourceDataField(field).srcField);
    this.retrieverTemplate = retrieverTemplate;
    this.sourceType = sourceType;
  }

  get type() {
    return this.sourceType;
  }

  /**
   * @param {LoaderSource} resource
   */
  static toRequestPayload(resource) {
    return {
      augmented_fields_after_chunking: resource.augmentedFieldsAfterChunking?.map(LoaderSourceAugmentedFieldFactory.toRequestPayload),
      data_fields: resource.dataFields?.map(field => LoaderSourceDataField.toRequestPayload({ srcField: field })),
      retriever_template: resource.retrieverTemplate,
      source_type: resource.sourceType,
    };
  }
}

export default LoaderSource;
