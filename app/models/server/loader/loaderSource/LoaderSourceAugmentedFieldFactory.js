import { StateConstant } from '~/constants';
import LoaderSourceAugmentedField from './LoaderSourceAugmentedField';
import LoaderSourceLlmAugmentedField from './LoaderSourceLlmAugmentedField';
import LoaderSourceStructuredLlmAugmentedField from './LoaderSourceStructuredLlmAugmentedField';

class LoaderSourceAugmentedFieldFactory {
  /**
   * @param {LoaderSourceAugmentedField} payload
   */
  static create(payload) {
    switch (payload.actionType) {
      case StateConstant.ActionType.LLM.value:
        return new LoaderSourceLlmAugmentedField(payload);
      case StateConstant.ActionType.STRUCTURED_LLM.value:
        return new LoaderSourceStructuredLlmAugmentedField(payload);
      default:
        return new LoaderSourceAugmentedField(payload);
    }
  }

  /**
   * @param {LoaderSourceAugmentedField} resource
   */
  static toRequestPayload(resource) {
    switch (resource.actionType) {
      case StateConstant.ActionType.LLM.value:
        return LoaderSourceLlmAugmentedField.toRequestPayload(resource);
      case StateConstant.ActionType.STRUCTURED_LLM.value:
        return LoaderSourceStructuredLlmAugmentedField.toRequestPayload(resource);
      default:
        return LoaderSourceAugmentedField.toRequestPayload(resource);
    }
  }
}

export default LoaderSourceAugmentedFieldFactory;
