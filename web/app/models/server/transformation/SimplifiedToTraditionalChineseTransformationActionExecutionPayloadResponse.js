import TransformationActionExecutionPayloadResponse from './TransformationActionExecutionPayloadResponse';

class SimplifiedToTraditionalChineseTransformationActionExecutionPayloadResponse extends TransformationActionExecutionPayloadResponse {
  constructor({
    input,
    transformation_type,
  } = {}) {
    super({
      input,
      transformation_type,
    });
  }
}

export default SimplifiedToTraditionalChineseTransformationActionExecutionPayloadResponse;
