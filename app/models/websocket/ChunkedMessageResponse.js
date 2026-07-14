/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChunkedMessageResponse {
  constructor({
    chunk_id: chunkId,
    chunk_index: chunkIndex,
    chunk_total: chunkTotal,
    chunked,
    payload,
  }) {
    this.chunked = chunked;
    this.chunkId = chunkId;
    this.chunkIndex = chunkIndex;
    this.chunkTotal = chunkTotal;
    this.payload = payload;
  }
}

export default ChunkedMessageResponse;
