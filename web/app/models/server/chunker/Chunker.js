import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Chunker extends Resource {
  constructor({
    chunkerId,
    chunkerName,
    chunkerType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.chunkerId = chunkerId ?? '';
    this.chunkerName = chunkerName ?? '';
    this.chunkerType = chunkerType ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.CHUNKER.value;
  }

  get id() {
    return this.chunkerId;
  }

  get name() {
    return this.chunkerName;
  }

  get type() {
    return this.chunkerType;
  }

  /**
   * @param {Chunker} resource
   */
  static toRequestPayload(resource) {
    return {
      chunker_id: resource.chunkerId,
      chunker_name: resource.chunkerName,
      chunker_type: resource.chunkerType,
    };
  }
}

export default Chunker;
