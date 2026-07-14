import { TransformationConstant } from '~/constants';
import SimplifiedToTraditionalChineseTransformationActionExecutionPayloadResponse from './SimplifiedToTraditionalChineseTransformationActionExecutionPayloadResponse';
import TransformationActionExecutionPayloadResponse from './TransformationActionExecutionPayloadResponse';

class TransformationActionExecutionPayloadResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.transformation_type
   */
  static create(payload) {
    const normalized = referencePathUtils.removeSuffixes(payload);
    // Use ?. to handle a potential null payload
    switch (normalized?.transformation_type) {
      case TransformationConstant.Type.SIMPLIFIED_TO_TRADITIONAL_CHINESE.value:
        return new SimplifiedToTraditionalChineseTransformationActionExecutionPayloadResponse(normalized);
      default:
        return new TransformationActionExecutionPayloadResponse(normalized);
    }
  }
}

export default TransformationActionExecutionPayloadResponseFactory;
