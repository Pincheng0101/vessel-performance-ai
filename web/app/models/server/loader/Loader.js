import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';
import { LoaderSourceFactory } from './loaderSource';

class Loader extends Resource {
  constructor({
    cron,
    knowledgeBaseId,
    loaderId,
    loaderName,
    loaderType,
    retrieverIds,
    sources,
    status,
    systemInfo,
    updatedTs,
    _resourceMap,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.cron = cron ?? null;
    this.knowledgeBaseId = knowledgeBaseId ?? '';
    this.loaderId = loaderId ?? '';
    this.loaderName = loaderName ?? '';
    this.loaderType = loaderType ?? '';
    this.retrieverIds = retrieverIds ?? [];
    this.sources = sources ?? [];
    this._resourceMap = _resourceMap ?? {};
  }

  get resourceType() {
    return ResourceConstant.Type.LOADER.value;
  }

  get id() {
    return this.loaderId;
  }

  get name() {
    return this.loaderName;
  }

  get type() {
    return this.loaderType;
  }

  /**
   * @param {Loader} resource
   */
  static toRequestPayload(resource) {
    return {
      cron: resource.cron,
      knowledge_base_id: resource.knowledgeBaseId,
      loader_id: resource.loaderId,
      loader_name: resource.loaderName,
      loader_type: resource.loaderType,
      retriever_ids: resource.retrieverIds,
      sources: resource.sources.map(source => LoaderSourceFactory.toRequestPayload(source, resource.loaderType)),
    };
  }

  /**
   * @param {Object|Object[]} resources
   */
  hydrateResourceMap(resources) {
    if (!resources) return;

    const resourceList = Array.isArray(resources) ? resources : [resources];
    this._resourceMap = {
      ...this._resourceMap,
      ...Object.fromEntries(resourceList.filter(resource => resource?.id).map(resource => [resource.id, resource])),
    };
  }
}

export default Loader;
