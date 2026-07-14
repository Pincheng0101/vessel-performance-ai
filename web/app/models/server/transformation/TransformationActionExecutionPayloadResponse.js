import TransformationActionExecutionPayload from './TransformationActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TransformationActionExecutionPayloadResponse extends TransformationActionExecutionPayload {
  constructor({
    transformation_type,
    input,
  } = {}) {
    super({
      transformationType: transformation_type,
      input,
    });
  }
}

export default TransformationActionExecutionPayloadResponse;
