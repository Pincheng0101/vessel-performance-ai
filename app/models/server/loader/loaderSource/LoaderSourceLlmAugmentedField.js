import LoaderSourceAugmentedField from './LoaderSourceAugmentedField';

class LoaderSourceLlmAugmentedField extends LoaderSourceAugmentedField {
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
   * @param {LoaderSourceLlmAugmentedField} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
    };
  }
}

export default LoaderSourceLlmAugmentedField;
