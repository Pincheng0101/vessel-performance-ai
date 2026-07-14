import { RankerConstant } from '~/constants';
import AmazonRanker from './AmazonRanker';
import CohereRanker from './CohereRanker';
import EmbeddingRanker from './EmbeddingRanker';
import JaccardSimilarityRanker from './JaccardSimilarityRanker';
import Ranker from './Ranker';

class RankerFactory {
  /**
   * @param {Ranker} payload
   */
  static create(payload) {
    switch (payload.rankerType) {
      case RankerConstant.Type.EMBEDDING.value:
        return new EmbeddingRanker(payload);
      case RankerConstant.Type.JACCARD_SIMILARITY.value:
        return new JaccardSimilarityRanker(payload);
      case RankerConstant.Type.COHERE.value:
        return new CohereRanker(payload);
      case RankerConstant.Type.AMAZON.value:
        return new AmazonRanker(payload);
      default:
        return new Ranker(payload);
    }
  }

  /**
   * @param {Ranker} resource
   */
  static toRequestPayload(resource) {
    switch (resource.rankerType) {
      case RankerConstant.Type.EMBEDDING.value:
        return EmbeddingRanker.toRequestPayload(resource);
      case RankerConstant.Type.JACCARD_SIMILARITY.value:
        return JaccardSimilarityRanker.toRequestPayload(resource);
      case RankerConstant.Type.COHERE.value:
        return CohereRanker.toRequestPayload(resource);
      case RankerConstant.Type.AMAZON.value:
        return AmazonRanker.toRequestPayload(resource);
      default:
        return Ranker.toRequestPayload(resource);
    }
  }
}

export default RankerFactory;
