import { StateConstant } from '~/constants';
import LoaderSourceAugmentedFieldResponse from './LoaderSourceAugmentedFieldResponse';
import LoaderSourceLlmAugmentedFieldResponse from './LoaderSourceLlmAugmentedFieldResponse';
import LoaderSourceStructuredLlmAugmentedFieldResponse from './LoaderSourceStructuredLlmAugmentedFieldResponse';

class LoaderSourceAugmentedFieldResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.action_type
   */
  static create(payload) {
    switch (payload.action_type) {
      case StateConstant.ActionType.LLM.value:
        return new LoaderSourceLlmAugmentedFieldResponse(payload);
      case StateConstant.ActionType.STRUCTURED_LLM.value:
        return new LoaderSourceStructuredLlmAugmentedFieldResponse(payload);
      default:
        return new LoaderSourceAugmentedFieldResponse(payload);
    }
  }
}

export default LoaderSourceAugmentedFieldResponseFactory;
