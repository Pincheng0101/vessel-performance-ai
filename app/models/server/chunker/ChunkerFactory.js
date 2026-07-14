import { ChunkerConstant } from '~/constants';
import Chunker from './Chunker';
import ConsecutiveChunker from './ConsecutiveChunker';
import CumulativeChunker from './CumulativeChunker';
import FixedSizeChunker from './FixedSizeChunker';
import MinimalPartitionChunker from './MinimalPartitionChunker';

class ChunkerFactory {
  /**
   * @param {Chunker} payload
   */
  static create(payload) {
    switch (payload.chunkerType) {
      case ChunkerConstant.Type.CONSECUTIVE.value:
        return new ConsecutiveChunker(payload);
      case ChunkerConstant.Type.CUMULATIVE.value:
        return new CumulativeChunker(payload);
      case ChunkerConstant.Type.FIXED_SIZE.value:
        return new FixedSizeChunker(payload);
      case ChunkerConstant.Type.MINIMAL_PARTITION.value:
        return new MinimalPartitionChunker(payload);
      default:
        return new Chunker(payload);
    }
  }

  /**
   * @param {Chunker} resource
   */
  static toRequestPayload(resource) {
    switch (resource.chunkerType) {
      case ChunkerConstant.Type.CONSECUTIVE.value:
        return ConsecutiveChunker.toRequestPayload(resource);
      case ChunkerConstant.Type.CUMULATIVE.value:
        return CumulativeChunker.toRequestPayload(resource);
      case ChunkerConstant.Type.FIXED_SIZE.value:
        return FixedSizeChunker.toRequestPayload(resource);
      case ChunkerConstant.Type.MINIMAL_PARTITION.value:
        return MinimalPartitionChunker.toRequestPayload(resource);
      default:
        return Chunker.toRequestPayload(resource);
    }
  }
}

export default ChunkerFactory;
