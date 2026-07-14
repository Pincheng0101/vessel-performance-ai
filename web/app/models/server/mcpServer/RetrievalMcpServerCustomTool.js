import McpServerCustomTool from './McpServerCustomTool';

class RetrievalMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    customToolType,
    dataFields,
    description,
    knowledgeBaseId,
    name,
    rankerId,
    retrieverIds,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.dataFields = dataFields ?? [];
    this.knowledgeBaseId = knowledgeBaseId ?? null;
    this.rankerId = rankerId ?? null;
    this.retrieverIds = retrieverIds ?? [];
  }

  /**
   * @param {RetrievalMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      knowledge_base_id: resource.knowledgeBaseId,
      retriever_ids: resource.retrieverIds,
      data_fields: resource.dataFields,
      ranker_id: resource.rankerId,
    };
  }
}

export default RetrievalMcpServerCustomTool;
