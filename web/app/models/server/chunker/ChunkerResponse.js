import Chunker from './Chunker';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChunkerResponse extends Chunker {
  constructor({
    chunker_id,
    chunker_name,
    chunker_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      chunkerId: chunker_id,
      chunkerName: chunker_name,
      chunkerType: chunker_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default ChunkerResponse;
