import FixedSizeChunker from './FixedSizeChunker';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class FixedSizeChunkerResponse extends FixedSizeChunker {
  constructor({
    chunker_id,
    chunker_name,
    chunker_type,
    chunk_overlap,
    chunk_size,
    separators,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      chunkerId: chunker_id,
      chunkerName: chunker_name,
      chunkerType: chunker_type,
      chunkOverlap: chunk_overlap,
      chunkSize: chunk_size,
      separators,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default FixedSizeChunkerResponse;
