import { TransformationConstant } from '~/constants';
import TransformationActionExecutionPayload from './TransformationActionExecutionPayload';

class SimplifiedToTraditionalChineseTransformationActionExecutionPayload extends TransformationActionExecutionPayload {
  constructor({
    input,
    transformationType,
  } = {}) {
    super({
      input: input ?? TransformationConstant.ActionExecutionParams.SIMPLIFIED_TO_TRADITIONAL_CHINESE_INPUT.default,
      transformationType,
    });
  }

  /**
   * @param {SimplifiedToTraditionalChineseTransformationActionExecutionPayload} transformation
   */
  static toRequestPayload(transformation) {
    return {
      ...super.toRequestPayload(transformation),
    };
  }
}

export default SimplifiedToTraditionalChineseTransformationActionExecutionPayload;
