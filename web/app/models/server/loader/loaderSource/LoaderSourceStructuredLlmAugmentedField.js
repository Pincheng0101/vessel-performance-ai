import LoaderSourceAugmentedField from './LoaderSourceAugmentedField';

class LoaderSourceStructuredLlmAugmentedField extends LoaderSourceAugmentedField {
  constructor({
    actionType,
    augmentedFieldName,
    defaultOutput,
    fallbackLlms,
    llm,
    retry,
    useExternalMemoryOutput,
  } = {}) {
    super({
      actionType,
      augmentedFieldName,
      defaultOutput,
      fallbackLlms,
      llm,
      retry,
      useExternalMemoryOutput,
    });
  }

  /**
   * @param {LoaderSourceStructuredLlmAugmentedField} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
    };
  }
}

export default LoaderSourceStructuredLlmAugmentedField;
