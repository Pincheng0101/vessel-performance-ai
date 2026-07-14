import { RankerConstant } from '~/constants';
import AmazonRankerResponse from './AmazonRankerResponse';
import CohereRankerResponse from './CohereRankerResponse';
import EmbeddingRankerResponse from './EmbeddingRankerResponse';
import JaccardSimilarityRankerResponse from './JaccardSimilarityRankerResponse';
import RankerResponse from './RankerResponse';

class RankerResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.ranker_type
   */
  static create(payload) {
    switch (payload.ranker_type) {
      case RankerConstant.Type.EMBEDDING.value:
        return new EmbeddingRankerResponse(payload);
      case RankerConstant.Type.JACCARD_SIMILARITY.value:
        return new JaccardSimilarityRankerResponse(payload);
      case RankerConstant.Type.COHERE.value:
        return new CohereRankerResponse(payload);
      case RankerConstant.Type.AMAZON.value:
        return new AmazonRankerResponse(payload);
      default:
        return new RankerResponse(payload);
    }
  }
}

export default RankerResponseFactory;
