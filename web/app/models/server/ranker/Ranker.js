import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Ranker extends Resource {
  constructor({
    rankerId,
    rankerName,
    rankerType,
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
    this.rankerId = rankerId ?? '';
    this.rankerName = rankerName ?? '';
    this.rankerType = rankerType ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.RANKER.value;
  }

  get id() {
    return this.rankerId;
  }

  get name() {
    return this.rankerName;
  }

  get type() {
    return this.rankerType;
  }

  /**
   * @param {Ranker} resource
   */
  static toRequestPayload(resource) {
    return {
      ranker_id: resource.rankerId,
      ranker_name: resource.rankerName,
      ranker_type: resource.rankerType,
    };
  }
}

export default Ranker;
