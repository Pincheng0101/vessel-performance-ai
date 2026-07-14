import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class KnowledgeBase extends Resource {
  constructor({
    dataFields,
    knowledgeBaseId,
    knowledgeBaseName,
    knowledgeBaseType,
    loaderId,
    opensearchIndexName,
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
    this.dataFields = dataFields ?? null;
    this.knowledgeBaseId = knowledgeBaseId ?? '';
    this.knowledgeBaseName = knowledgeBaseName ?? '';
    this.knowledgeBaseType = knowledgeBaseType ?? '';
    this.loaderId = loaderId ?? null;
    this.openSearchIndexName = opensearchIndexName ?? '';
    this._resourceMap = _resourceMap ?? {};
  }

  get resourceType() {
    return ResourceConstant.Type.KNOWLEDGE_BASE.value;
  }

  get id() {
    return this.knowledgeBaseId;
  }

  get name() {
    return this.knowledgeBaseName;
  }

  get type() {
    return this.knowledgeBaseType;
  }

  /**
   * @param {KnowledgeBase} resource
   */
  static toRequestPayload(resource) {
    return {
      knowledge_base_id: resource.knowledgeBaseId,
      knowledge_base_name: resource.knowledgeBaseName,
      knowledge_base_type: resource.knowledgeBaseType,
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

export default KnowledgeBase;
