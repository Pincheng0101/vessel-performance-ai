import { LlmActionExecutionPayloadResponseFactory } from '~/models/server/llm';
import { RetryActionExecutionPayloadResponse } from '~/models/server/retry';
import LoaderSourceAugmentedField from './LoaderSourceAugmentedField';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LoaderSourceAugmentedFieldResponse extends LoaderSourceAugmentedField {
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
      actionType: action_type,
      augmentedFieldName: augmented_field_name,
      defaultOutput: default_output,
      fallbackLlms: Array.isArray(fallback_llms) ? fallback_llms.map(llm => LlmActionExecutionPayloadResponseFactory.create(llm)) : [],
      llm: LlmActionExecutionPayloadResponseFactory.create(llm),
      retry: retry ? new RetryActionExecutionPayloadResponse(retry) : retry,
      useExternalMemoryOutput: use_external_memory_output,
    });
  }
}

export default LoaderSourceAugmentedFieldResponse;
