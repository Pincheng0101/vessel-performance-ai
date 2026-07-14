import { RankerConstant } from '~/constants';
import AmazonRankerActionExecutionPayload from './AmazonRankerActionExecutionPayload';
import CohereRankerActionExecutionPayload from './CohereRankerActionExecutionPayload';
import EmbeddingRankerActionExecutionPayload from './EmbeddingRankerActionExecutionPayload';
import JaccardSimilarityRankerActionExecutionPayload from './JaccardSimilarityRankerActionExecutionPayload';
import RankerActionExecutionPayload from './RankerActionExecutionPayload';

class RankerActionExecutionPayloadFactory {
  /**
   * @param {RankerActionExecutionPayload} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.rankerType) {
      case RankerConstant.Type.EMBEDDING.value:
        return new EmbeddingRankerActionExecutionPayload(payload);
      case RankerConstant.Type.JACCARD_SIMILARITY.value:
        return new JaccardSimilarityRankerActionExecutionPayload(payload);
      case RankerConstant.Type.COHERE.value:
        return new CohereRankerActionExecutionPayload(payload);
      case RankerConstant.Type.AMAZON.value:
        return new AmazonRankerActionExecutionPayload(payload);
      default:
        return new RankerActionExecutionPayload(payload);
    }
  }

  /**
   * @param {RankerActionExecutionPayload} ranker
   */
  static toRequestPayload(ranker) {
    switch (ranker.rankerType) {
      case RankerConstant.Type.EMBEDDING.value:
        return EmbeddingRankerActionExecutionPayload.toRequestPayload(ranker);
      case RankerConstant.Type.JACCARD_SIMILARITY.value:
        return JaccardSimilarityRankerActionExecutionPayload.toRequestPayload(ranker);
      case RankerConstant.Type.COHERE.value:
        return CohereRankerActionExecutionPayload.toRequestPayload(ranker);
      case RankerConstant.Type.AMAZON.value:
        return AmazonRankerActionExecutionPayload.toRequestPayload(ranker);
      default:
        return RankerActionExecutionPayload.toRequestPayload(ranker);
    }
  }
}

export default RankerActionExecutionPayloadFactory;
