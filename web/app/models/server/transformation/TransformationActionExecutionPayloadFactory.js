import { TransformationConstant } from '~/constants';
import SimplifiedToTraditionalChineseTransformationActionExecutionPayload from './SimplifiedToTraditionalChineseTransformationActionExecutionPayload';
import TransformationActionExecutionPayload from './TransformationActionExecutionPayload';

class TransformationActionExecutionPayloadFactory {
  /**
   * @param {TransformationActionExecutionPayload} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.transformationType) {
      case TransformationConstant.Type.SIMPLIFIED_TO_TRADITIONAL_CHINESE.value:
        return new SimplifiedToTraditionalChineseTransformationActionExecutionPayload(payload);
      default:
        return new TransformationActionExecutionPayload(payload);
    }
  }

  /**
   * @param {TransformationActionExecutionPayload} transformation
   */
  static toRequestPayload(transformation) {
    return TransformationActionExecutionPayload.toRequestPayload(transformation);
  }
}

export default TransformationActionExecutionPayloadFactory;
