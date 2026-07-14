import { RankerConstant } from '~/constants';
import AmazonRankerActionExecutionPayloadResponse from './AmazonRankerActionExecutionPayloadResponse';
import CohereRankerActionExecutionPayloadResponse from './CohereRankerActionExecutionPayloadResponse';
import EmbeddingRankerActionExecutionPayloadResponse from './EmbeddingRankerActionExecutionPayloadResponse';
import JaccardSimilarityRankerActionExecutionPayloadResponse from './JaccardSimilarityActionExecutionPayloadResponse';
import RankerActionExecutionPayloadResponse from './RankerActionExecutionPayloadResponse';

class RankerActionExecutionPayloadResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.ranker_type
   */
  static create(payload) {
    const normalized = referencePathUtils.removeSuffixes(payload);
    // Use ?. to handle a potential null payload
    switch (normalized?.ranker_type) {
      case RankerConstant.Type.EMBEDDING.value:
        return new EmbeddingRankerActionExecutionPayloadResponse(normalized);
      case RankerConstant.Type.JACCARD_SIMILARITY.value:
        return new JaccardSimilarityRankerActionExecutionPayloadResponse(normalized);
      case RankerConstant.Type.COHERE.value:
        return new CohereRankerActionExecutionPayloadResponse(normalized);
      case RankerConstant.Type.AMAZON.value:
        return new AmazonRankerActionExecutionPayloadResponse(normalized);
      default:
        return new RankerActionExecutionPayloadResponse(normalized);
    }
  }
}

export default RankerActionExecutionPayloadResponseFactory;
