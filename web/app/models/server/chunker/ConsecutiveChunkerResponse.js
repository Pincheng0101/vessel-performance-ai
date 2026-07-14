import ConsecutiveChunker from './ConsecutiveChunker';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ConsecutiveChunkerResponse extends ConsecutiveChunker {
  constructor({
    chunker_id,
    chunker_name,
    chunker_type,
    embedding_model_id,
    max_chunk_size,
    min_chunk_size,
    separators,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      chunkerId: chunker_id,
      chunkerName: chunker_name,
      chunkerType: chunker_type,
      embeddingModelId: embedding_model_id,
      maxChunkSize: max_chunk_size,
      minChunkSize: min_chunk_size,
      separators,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default ConsecutiveChunkerResponse;
