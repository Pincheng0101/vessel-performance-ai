import { LlmActionExecutionPayloadFactory } from '~/models/server/llm';
import { RetryActionExecutionPayload } from '~/models/server/retry';

class LoaderSourceAugmentedField {
  constructor({
    actionType,
    augmentedFieldName,
    defaultOutput,
    fallbackLlms,
    llm,
    retry,
    useExternalMemoryOutput,
  } = {}) {
    this.actionType = actionType;
    this.augmentedFieldName = augmentedFieldName;
    this.defaultOutput = defaultOutput;
    this.fallbackLlms = Array.isArray(fallbackLlms) ? fallbackLlms.map(llm => LlmActionExecutionPayloadFactory.create(llm)) : [];
    this.llm = LlmActionExecutionPayloadFactory.create(llm);
    this.retry = retry ? (new RetryActionExecutionPayload(retry)).attempts > 0 : retry;
    this.useExternalMemoryOutput = useExternalMemoryOutput;
  }

  /**
   * @param {LoaderSourceAugmentedField} resource
   */
  static toRequestPayload(resource) {
    return {
      action_type: resource.actionType,
      augmented_field_name: resource.augmentedFieldName,
      default_output: resource.defaultOutput,
      fallback_llms: Array.isArray(resource.fallbackLlms) ? resource.fallbackLlms.map(llm => LlmActionExecutionPayloadFactory.toRequestPayload(llm)) : [],
      llm: LlmActionExecutionPayloadFactory.toRequestPayload(resource.llm),
      retry: RetryActionExecutionPayload.toRequestPayload(resource.retry),
      use_external_memory_output: resource.useExternalMemoryOutput,
    };
  }

  /**
   * @param {LoaderSourceAugmentedField[]} augmentedFields
   */
  static sanitize(augmentedFields) {
    if (!augmentedFields?.length) return augmentedFields;

    return augmentedFields.map((field) => {
      const { llm, ...rest } = field;
      const hasContent = !!llm?.content;
      const hasMessages = !!llm?.messages;

      const newLlm = { ...llm };

      if (hasContent && !hasMessages) {
        delete newLlm.messages;
      } else if (!hasContent && hasMessages) {
        delete newLlm.content;
      }

      return { ...rest, llm: newLlm };
    });
  };
}

export default LoaderSourceAugmentedField;
