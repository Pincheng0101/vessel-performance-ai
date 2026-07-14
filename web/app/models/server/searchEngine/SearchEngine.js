import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class SearchEngine extends Resource {
  constructor({
    searchEngineId,
    searchEngineName,
    searchEngineType,
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
    this.searchEngineId = searchEngineId ?? null;
    this.searchEngineName = searchEngineName ?? null;
    this.searchEngineType = searchEngineType ?? null;
  }

  get resourceType() {
    return ResourceConstant.Type.SEARCH_ENGINE.value;
  }

  get id() {
    return this.searchEngineId;
  }

  get name() {
    return this.searchEngineName;
  }

  get type() {
    return this.searchEngineType;
  }

  /**
   * @param {SearchEngine} resource
   */
  static toRequestPayload(resource) {
    return {
      search_engine_id: resource.searchEngineId,
      search_engine_name: resource.searchEngineName,
      search_engine_type: resource.searchEngineType,
    };
  }
}

export default SearchEngine;
