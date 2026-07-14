import { ChunkerConstant } from '~/constants';
import ChunkerResponse from './ChunkerResponse';
import ConsecutiveChunkerResponse from './ConsecutiveChunkerResponse';
import CumulativeChunkerResponse from './CumulativeChunkerResponse';
import FixedSizeChunkerResponse from './FixedSizeChunkerResponse';
import MinimalPartitionChunkerResponse from './MinimalPartitionChunkerResponse';

class ChunkerResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.chunker_type
   */
  static create(payload) {
    switch (payload.chunker_type) {
      case ChunkerConstant.Type.CONSECUTIVE.value:
        return new ConsecutiveChunkerResponse(payload);
      case ChunkerConstant.Type.CUMULATIVE.value:
        return new CumulativeChunkerResponse(payload);
      case ChunkerConstant.Type.FIXED_SIZE.value:
        return new FixedSizeChunkerResponse(payload);
      case ChunkerConstant.Type.MINIMAL_PARTITION.value:
        return new MinimalPartitionChunkerResponse(payload);
      default:
        return new ChunkerResponse(payload);
    }
  }
}

export default ChunkerResponseFactory;
