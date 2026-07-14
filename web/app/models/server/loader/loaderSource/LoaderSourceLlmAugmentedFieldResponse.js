import LoaderSourceAugmentedFieldResponse from './LoaderSourceAugmentedFieldResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LoaderSourceLlmAugmentedFieldResponse extends LoaderSourceAugmentedFieldResponse {
  constructor({
    action_type,
    augmented_field_name,
    default_output,
    fallback_llms,
    llm,
    retry,
    use_external_memory_output,
  } = {}) {
    super({
      action_type,
      augmented_field_name,
      default_output,
      fallback_llms,
      llm,
      retry,
      use_external_memory_output,
    });
  }
}

export default LoaderSourceLlmAugmentedFieldResponse;
