import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Retriever extends Resource {
  constructor({
    retrieverId,
    retrieverName,
    retrieverType,
    filterQuery,
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
    this.retrieverId = retrieverId ?? '';
    this.retrieverName = retrieverName ?? '';
    this.retrieverType = retrieverType ?? '';
    this.filterQuery = filterQuery ?? null;
  }

  get resourceType() {
    return ResourceConstant.Type.RETRIEVER.value;
  }

  get id() {
    return this.retrieverId;
  }

  get name() {
    return this.retrieverName;
  }

  get type() {
    return this.retrieverType;
  }

  /**
   * @param {Retriever} resource
   */
  static toRequestPayload(resource) {
    return {
      retriever_id: resource.retrieverId,
      retriever_name: resource.retrieverName,
      retriever_type: resource.retrieverType,
      filter_query: resource.filterQuery,
    };
  }
}

export default Retriever;
